import { Buffer } from 'buffer';
import { join, relative, resolve } from 'path';
import type { ParsedUrlQuery } from 'querystring';
import { UrlWithParsedQuery, format as formatUrl } from 'url';

import {
  APP_PATHS_MANIFEST,
  BUILD_ID_FILE,
  CLIENT_PUBLIC_FILES_PATH,
  CLIENT_STATIC_FILES_PATH,
  CLIENT_STATIC_FILES_RUNTIME,
  PAGES_MANIFEST,
  PRERENDER_MANIFEST,
  ROUTES_MANIFEST
} from 'next/constants';
import { PrerenderManifest } from 'next/dist/build';
import { PagesManifest } from 'next/dist/build/webpack/plugins/pages-manifest-plugin';
import isError from 'next/dist/lib/is-error';
import { CustomRoutes, Rewrite } from 'next/dist/lib/load-custom-routes';
import { BaseNextRequest, BaseNextResponse } from 'next/dist/server/base-http';
import BaseServer, { stringifyQuery } from 'next/dist/server/base-server';
import { FontManifest } from 'next/dist/server/font-utils';
import { addRequestMeta, NextParsedUrlQuery } from 'next/dist/server/request-meta';
import { RenderOpts, renderToHTML } from 'next/dist/server/render';
import RenderResult from 'next/dist/server/render-result';
import { Route } from 'next/dist/server/router';
import { PayloadOptions } from 'next/dist/server/send-payload';
import { getCustomRoute } from 'next/dist/server/server-route-utils';
import { normalizePagePath } from 'next/dist/shared/lib/page-path/normalize-page-path';
import { Params } from 'next/dist/shared/lib/router/utils/route-matcher';
import { ParsedUrl } from 'next/dist/shared/lib/router/utils/parse-url';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { CacheFs, PageNotFoundError } from 'next/dist/shared/lib/utils';

import { ComputeJsNextRequestPrev, ComputeJsNextResponsePrev } from './base-http/compute-js';
import { ComputeJsServerOptions } from './common';
import { apiResolver, getBackendInfo } from './compute-js';
import {
  assetDirectory,
  assetDirectoryExists,
  assetFileExists,
  getPagePath,
  readAssetFileAsString,
  readAssetManifest,
  readAssetModule,
  requireFontManifest,
} from './require';
import { loadComponents } from './load-components';
import { serveStatic } from './serve-static';
import { sendRenderResult } from './send-payload';

export default class NextComputeJsServer extends BaseServer<ComputeJsServerOptions> {
  constructor(options: ComputeJsServerOptions) {
    super(options);

    /**
     * This sets environment variable to be used at the time of SSR by head.tsx.
     * Using this from process.env allows targeting both serverless and SSR by calling
     * `process.env.__NEXT_OPTIMIZE_CSS`.
     */
    if (this.renderOpts.optimizeFonts) {
      process.env.__NEXT_OPTIMIZE_FONTS = JSON.stringify(true);
    }
    if (this.renderOpts.optimizeCss) {
      process.env.__NEXT_OPTIMIZE_CSS = JSON.stringify(true);
    }
    if (this.renderOpts.nextScriptWorkers) {
      process.env.__NEXT_SCRIPT_WORKERS = JSON.stringify(true);
    }

    // pre-warm _document and _app as these will be
    // needed for most requests
    loadComponents(
      this.serverOptions.computeJs.assets,
      this.distDir,
      '/_document',
      this.dir,
      this._isLikeServerless
    ).catch(
      () => {}
    );

    loadComponents(
      this.serverOptions.computeJs.assets,
      this.distDir,
      '/_app',
      this.dir,
      this._isLikeServerless
    ).catch(
      () => {}
    );
  }

  protected loadEnvConfig(params: { dev: boolean }): void {
    // NOTE: No ENV in Fastly Compute@Edge, at least for now
  }

  protected getPublicDir(): string {
    return join(this.dir, CLIENT_PUBLIC_FILES_PATH);
  }

  protected getHasStaticDir(): boolean {
    return assetDirectoryExists(
      this.serverOptions.computeJs.assets,
      join(this.dir, 'static'),
      this.dir,
    );
  }

  protected getPagesManifest(): PagesManifest | undefined {
    const pagesManifestFile = join(this.serverDistDir, PAGES_MANIFEST);
    return readAssetManifest(
      this.serverOptions.computeJs.assets,
      pagesManifestFile,
      this.dir
    );
  }

  protected getAppPathsManifest(): PagesManifest | undefined {
    if (this.nextConfig.experimental.appDir) {
      const appPathsManifestPath = join(this.serverDistDir, APP_PATHS_MANIFEST);
      return readAssetManifest(
        this.serverOptions.computeJs.assets,
        appPathsManifestPath,
        this.dir
      );
    }
    return undefined;
  }

  protected getBuildId(): string {
    const buildIdFile = join(this.distDir, BUILD_ID_FILE);

    try {
      const content = readAssetFileAsString(
        this.serverOptions.computeJs.assets,
        buildIdFile,
        this.dir
      );
      return content.trim();
    } catch (err) {
      if (
        !assetFileExists(
          this.serverOptions.computeJs.assets,
          buildIdFile,
          this.dir,
        )
      ) {
        throw new Error(
          `Could not find a production build in the '${this.distDir}' directory. Try building your app with 'next build' before starting the production server. https://nextjs.org/docs/messages/production-start-no-build-id`
        );
      }
      throw err;
    }
  }

  protected generateImageRoutes(): Route[] {
    return [];
  }

  protected generateStaticRoutes(): Route[] {
    return this.hasStaticDir
      ? [
          {
            // It's very important to keep this route's param optional.
            // (but it should support as many params as needed, separated by '/')
            // Otherwise this will lead to a pretty simple DOS attack.
            // See more: https://github.com/vercel/next.js/issues/2617
            match: getPathMatch('/static/:path*'),
            name: 'static catchall',
            fn: async (req, res, params, parsedUrl) => {
              const p = join(this.dir, 'static', ...params.path);
              await this.serveStatic(req, res, p, parsedUrl);
              return {
                finished: true,
              };
            },
          } as Route,
        ]
      : [];
  }

  protected setImmutableAssetCacheControl(res: BaseNextResponse): void {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  protected generateFsStaticRoutes(): Route[] {
    return [
      {
        match: getPathMatch('/_next/static/:path*'),
        type: 'route',
        name: '_next/static catchall',
        fn: async (req, res, params, parsedUrl) => {
          // make sure to 404 for /_next/static itself
          if (!params.path) {
            await this.render404(req, res, parsedUrl);
            return {
              finished: true,
            };
          }

          if (
            params.path[0] === CLIENT_STATIC_FILES_RUNTIME ||
            params.path[0] === 'chunks' ||
            params.path[0] === 'css' ||
            params.path[0] === 'image' ||
            params.path[0] === 'media' ||
            params.path[0] === this.buildId ||
            params.path[0] === 'pages' ||
            params.path[1] === 'pages'
          ) {
            this.setImmutableAssetCacheControl(res);
          }
          const p = join(
            this.distDir,
            CLIENT_STATIC_FILES_PATH,
            ...(params.path || [])
          );
          await this.serveStatic(req, res, p, parsedUrl);
          return {
            finished: true,
          };
        },
      },
    ];
  }

  protected generatePublicRoutes(): Route[] {
    const publicFiles = new Set(
      assetDirectory(
        this.serverOptions.computeJs.assets,
        this.publicDir,
        this.dir,
      ).map((p) => {
        const realPath = resolve(this.dir, '.' + p);
        const relPath = relative(this.publicDir, realPath);
        return '/' + encodeURI(relPath.replace(/\\/g, '/'));
      })
    );
    if(publicFiles.size === 0) {
      return [];
    }

    return [
      {
        match: getPathMatch('/:path*'),
        matchesBasePath: true,
        name: 'public folder catchall',
        fn: async (req, res, params, parsedUrl) => {
          const pathParts: string[] = params.path || [];
          const { basePath } = this.nextConfig;

          // if basePath is defined require it be present
          if (basePath) {
            const basePathParts = basePath.split('/');
            // remove first empty value
            basePathParts.shift();

            if (
              !basePathParts.every((part: string, idx: number) =>
                part === pathParts[idx]
              )
            ) {
              return { finished: false };
            }

            pathParts.splice(0, basePathParts.length);
          }

          let path = `/${pathParts.join('/')}`;

          if (!publicFiles.has(path)) {
            // In `next-dev-server.ts`, we ensure encoded paths match
            // decoded paths on the filesystem. So we need do the
            // opposite here: make sure decoded paths match encoded.
            path = encodeURI(path);
          }

          if (publicFiles.has(path)) {
            await this.serveStatic(
              req,
              res,
              join(this.publicDir, ...pathParts),
              parsedUrl
            );
            return {
              finished: true,
            };
          }
          return {
            finished: false,
          };
        },
      } as Route,
    ];
  }

  private _validFilesystemPathSet: Set<string> | null = null;
  protected getFilesystemPaths(): Set<string> {
    if (this._validFilesystemPathSet) {
      return this._validFilesystemPathSet;
    }

    let userFilesStatic: string[] = [];
    if (this.hasStaticDir) {
      userFilesStatic = assetDirectory(
        this.serverOptions.computeJs.assets,
        join(this.dir, 'static'),
        this.dir,
      );
    }

    let userFilesPublic: string[] = [];
    if (this.publicDir) {
      userFilesPublic = assetDirectory(
        this.serverOptions.computeJs.assets,
        join(this.dir, CLIENT_PUBLIC_FILES_PATH),
        this.dir,
      );
    }

    let nextFilesStatic: string[] = [];
    if(!this.minimalMode) {
      userFilesStatic = assetDirectory(
        this.serverOptions.computeJs.assets,
        join(this.distDir, 'static'),
        this.dir,
      );
    }

    return (this._validFilesystemPathSet = new Set<string>([
      ...nextFilesStatic,
      ...userFilesPublic,
      ...userFilesStatic,
    ]));
  }

  protected async sendRenderResult(
    req: ComputeJsNextRequestPrev,
    res: ComputeJsNextResponsePrev,
    options: {
      result: RenderResult;
      type: "html" | "json";
      generateEtags: boolean;
      poweredByHeader: boolean;
      options?: PayloadOptions
    }
  ): Promise<void> {
    return await sendRenderResult({
      req,
      res,
      ...options,
    });
  }

  protected async sendStatic(
    req: ComputeJsNextRequestPrev,
    res: ComputeJsNextResponsePrev,
    path: string,
  ): Promise<void> {
    return serveStatic(
      this.serverOptions.computeJs.assets,
      req,
      res,
      path,
      this.dir,
    );
  }

  protected handleCompression(
    req: ComputeJsNextRequestPrev,
    res: ComputeJsNextResponsePrev
  ): void {
    // TODO: Do some compression() -like thing
  }

  protected async proxyRequest(
    req: BaseNextRequest,
    res: BaseNextResponse,
    parsedUrl: ParsedUrl
  ) {
    const { query } = parsedUrl;
    delete (parsedUrl as any).query;
    parsedUrl.search = stringifyQuery(req, query);

    const target = formatUrl(parsedUrl);

    if(!(req instanceof ComputeJsNextRequestPrev) ||
      !(res instanceof ComputeJsNextResponsePrev)
    ) {
      throw new Error('Unexpected');
    }

    const backend = getBackendInfo(this.serverOptions.computeJs.backends, target);
    if(backend == null) {
      // Unable to proxy, due to no backend
      throw new Error(`Backend not found for '${target}'`);
    }

    const headers: Record<string, string> = {};

    // Rewrite host header
    headers['host'] = new URL(backend.url).host;

    // XFF
    const url = new URL(req.request.url);
    const port = url.port || '443';       // C@E can only be on 443, except when running locally
    const proto = 'https';                // C@E can only be accessed via HTTPS

    const values: Record<string, string> = {
      for: req.clientInfo.address,
      port,
      proto,
    };

    ['for', 'port', 'proto'].forEach(function(header) {
      const arr: string[] = [];
      let strs = req.headers['x-forwarded-' + header];
      if(Array.isArray(strs)) {
        strs = strs.join(',');
      }
      if(strs) {
        arr.push(strs);
      }
      arr.push(values[header]);
      headers['x-forwarded-' + header] = arr.join(',');
    });

    const response = await fetch(backend.target, {
      backend: backend.name,
      method: req.request.method,
      headers,
      body: req.request.body,
      cacheOverride: new CacheOverride('pass'),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    res.statusCode = response.status;
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });
    res.body(buffer);
    res.send();

    return {
      finished: true,
    };
  }

  protected async runApi(
    req: ComputeJsNextRequestPrev,
    res: ComputeJsNextResponsePrev,
    query: ParsedUrlQuery,
    params: Params | undefined,
    page: string,
    builtPagePath: string,
  ): Promise<boolean> {
    console.log({query, params, page, builtPagePath});

    // node's next-server would try to run this first as an edge function.
    // TODO: do that one day =)

    const pageModule = readAssetModule(
      this.serverOptions.computeJs.assets,
      builtPagePath,
      this.dir
    );

    query = { ...query, ...params }

    delete query.__nextLocale
    delete query.__nextDefaultLocale

    // node's next-server would try to run this as a serverless
    // it's hard to tell at this moment whether that is the right
    // thing to do.

    await apiResolver(
      req,
      res,
      query,
      pageModule,
      {
        ...this.renderOpts.previewProps,
        // not implementing revalidate at this moment
        // internal config so is not typed
        trustHostHeader: (this.nextConfig.experimental as any).trustHostHeader,
      },
      this.minimalMode,
      this.renderOpts.dev,
      page
    );
    return true;
  }

  protected async renderHTML(
    req: ComputeJsNextRequestPrev,
    res: ComputeJsNextResponsePrev,
    pathname: string,
    query: NextParsedUrlQuery,
    renderOpts: RenderOpts
  ): Promise<RenderResult | null> {
    // TODO: revisit this
    return renderToHTML(
      {
        url: req.url,
        cookies: req.cookies,
        headers: req.headers,
      } as any,
      {} as any,
      pathname,
      query,
      {
        ...renderOpts,
        disableOptimizedLoading: true,
        runtime: 'experimental-edge',
      }
    );
  }

  public async serveStatic(
    req: BaseNextRequest,
    res: BaseNextResponse,
    path: string,
    parsedUrl?: UrlWithParsedQuery
  ): Promise<void> {
    if (!this.isServeableUrl(path)) {
      return this.render404(req, res, parsedUrl);
    }

    if (!(req.method === 'GET' || req.method === 'HEAD')) {
      res.statusCode = 405;
      res.setHeader('Allow', ['GET', 'HEAD']);
      return this.renderError(null, req, res, path);
    }

    try {
      await this.sendStatic(
        req as ComputeJsNextRequestPrev,
        res as ComputeJsNextResponsePrev,
        path
      );
    } catch (error) {
      if (!isError(error)) throw error;
      const err = error as Error & { code?: string; statusCode?: number };
      if (err.code === 'ENOENT' || err.statusCode === 404) {
        await this.render404(req, res, parsedUrl);
      } else if (err.statusCode === 412) {
        res.statusCode = 412;
        return this.renderError(err, req, res, path);
      } else {
        throw err;
      }
    }
  }

  protected isServeableUrl(untrustedFileUrl: string): boolean {

    // This method mimics what the version of `send` we use does:
    // 1. decodeURIComponent:
    //    https://github.com/pillarjs/send/blob/0.17.1/index.js#L989
    //    https://github.com/pillarjs/send/blob/0.17.1/index.js#L518-L522
    // 2. resolve:
    //    https://github.com/pillarjs/send/blob/de073ed3237ade9ff71c61673a34474b30e5d45b/index.js#L561

    let decodedUntrustedFilePath: string;
    try {
      // (1) Decode the URL so we have the proper file name
      decodedUntrustedFilePath = decodeURIComponent(untrustedFileUrl);
    } catch {
      return false;
    }

    // (2) Resolve "up paths" to determine real request
    const untrustedFilePath = resolve(decodedUntrustedFilePath);

    // Check against the real filesystem paths
    const filesystemUrls = this.getFilesystemPaths();
    const resolved = relative(this.dir, untrustedFilePath);

    return filesystemUrls.has('/' + resolved);
  }

  protected generateCatchAllMiddlewareRoute(): Route[] {
    // TODO Edge Functions / Middleware
    // These are challenging at the moment to run in C@E, because
    // Next.js builds middleware as edge functions, and edge functions
    // are built as "edge functions" meant to run in Vercel's runtime.
    return [];
  }

  protected generateRewrites({
    restrictedRedirectPaths,
  }: {
    restrictedRedirectPaths: string[]
  }) {
    let beforeFiles: Route[] = [];
    let afterFiles: Route[] = [];
    let fallback: Route[] = [];

    if (!this.minimalMode) {
      const buildRewrite = (rewrite: Rewrite, check = true): Route => {
        const rewriteRoute = getCustomRoute({
          type: 'rewrite',
          rule: rewrite,
          restrictedRedirectPaths,
        });
        return {
          ...rewriteRoute,
          check,
          type: rewriteRoute.type,
          name: `Rewrite route ${rewriteRoute.source}`,
          match: rewriteRoute.match,
          matchesBasePath: true,
          matchesLocale: true,
          matchesLocaleAPIRoutes: true,
          matchesTrailingSlash: true,
          fn: async (req, res, params, parsedUrl) => {
            const { newUrl, parsedDestination } = prepareDestination({
              appendParamsToQuery: true,
              destination: rewriteRoute.destination,
              params: params,
              query: parsedUrl.query,
            });

            // external rewrite, proxy it
            if (parsedDestination.protocol) {
              // TODO: We need an implementation that uses fetch() and can only go to preregistered backends
              // or maybe we can use Dynamic Backends feature once it's available
              return this.proxyRequest(
                req,
                res,
                parsedDestination
              );
            }

            addRequestMeta(req, '_nextRewroteUrl', newUrl);
            addRequestMeta(req, '_nextDidRewrite', newUrl !== req.url);

            return {
              finished: false,
              pathname: newUrl,
              query: parsedDestination.query,
            };
          },
        }
      }

      if (Array.isArray(this.customRoutes.rewrites)) {
        afterFiles = this.customRoutes.rewrites.map((r) => buildRewrite(r));
      } else {
        beforeFiles = this.customRoutes.rewrites.beforeFiles.map((r) =>
          buildRewrite(r, false)
        );
        afterFiles = this.customRoutes.rewrites.afterFiles.map((r) =>
          buildRewrite(r)
        );
        fallback = this.customRoutes.rewrites.fallback.map((r) =>
          buildRewrite(r)
        );
      }
    }

    return {
      beforeFiles,
      afterFiles,
      fallback,
    };
  }

  protected getPagePath(
    pathname: string,
    locales: string[] | undefined
  ): string {
    return getPagePath(
      this.serverOptions.computeJs.assets,
      pathname,
      this.dir,
      this.distDir,
      this._isLikeServerless,
      this.renderOpts.dev,
      locales,
      this.nextConfig.experimental.appDir
    );
  }

  protected async findPageComponents(
    pathname: string,
    query: NextParsedUrlQuery = {},
    params: Params | null = null,
  ) {
    let paths = [
      // try serving a static AMP version first
      query.amp ? normalizePagePath(pathname) + '.amp' : null,
      pathname,
    ].filter(Boolean);

    if (query.__nextLocale) {
      paths = [
        ...paths.map(
          (path) => `/${query.__nextLocale}${path === '/' ? '' : path}`
        ),
        ...paths,
      ];
    }

    for (const pagePath of paths) {
      try {
        const components = await loadComponents(
          this.serverOptions.computeJs.assets,
          this.distDir,
          pagePath!,
          this.dir,
          !this.renderOpts.dev && this._isLikeServerless,
          this.renderOpts.serverComponents,
          this.nextConfig.experimental.appDir
        );

        if (
          query.__nextLocale &&
          typeof components.Component === 'string' &&
          !pagePath?.startsWith(`/${query.__nextLocale}`)
        ) {
          // if loading a static HTML file the locale is required
          // to be present since all HTML files are output under their locale
          continue;
        }

        return {
          components,
          query: {
            ...(components.getStaticProps
              ? ({
                  amp: query.amp,
                  __nextDataReq: query.__nextDataReq,
                  __nextLocale: query.__nextLocale,
                  __nextDefaultLocale: query.__nextDefaultLocale,
                  __flight__: query.__flight__,
                } as NextParsedUrlQuery)
              : query),
            ...(params || {}),
          },
        };
      } catch (err) {
        // we should only not throw if we failed to find the page
        // in the pages-manifest
        if (!(err instanceof PageNotFoundError)) {
          throw err;
        }
      }
    }

    return null;
  }

  protected getFontManifest(): FontManifest | undefined {
    return requireFontManifest(
      this.serverOptions.computeJs.assets,
      this.distDir,
      this.dir,
      this._isLikeServerless,
    );
  }

  protected getServerComponentManifest(): any {
    // TODO: If we want to support Server Components
    return undefined;
  }

  // We're going to use the time the build happened as the last modified time for the
  // sake of the cache file system for now.
  private static _mtime = new Date();
  protected override getCacheFilesystem(): CacheFs {
    return {
      readFile: (f) => {
        const content = readAssetFileAsString(
          this.serverOptions.computeJs.assets,
          f,
          this.dir
        );
        return Promise.resolve(content);
      },
      readFileSync: (f) => {
        return readAssetFileAsString(
          this.serverOptions.computeJs.assets,
          f,
          this.dir
        );
      },
      writeFile: (f, d) => {
        throw new Error("Writing to cache not currently supported");
      },
      mkdir: (dir) => {
        // writing to cache not currently supported, but silently succeed on mkdir for now
        return Promise.resolve();
      },
      stat: (f) => {
        return Promise.resolve({mtime: NextComputeJsServer._mtime});
      },
    }
  }

  private _cachedPreviewManifest: PrerenderManifest | undefined
  protected getPrerenderManifest(): PrerenderManifest {
    if (this._cachedPreviewManifest) {
      return this._cachedPreviewManifest
    }
    const manifestFile = join(this.distDir, PRERENDER_MANIFEST);
    const manifest = readAssetManifest(
      this.serverOptions.computeJs.assets,
      manifestFile,
      this.dir
    );
    return (this._cachedPreviewManifest = manifest);
  }

  protected getRoutesManifest(): CustomRoutes {
    const routesManifestFile = join(this.distDir, ROUTES_MANIFEST);
    return readAssetManifest(
      this.serverOptions.computeJs.assets,
      routesManifestFile,
      this.dir
    );
  }

  protected override async getFallback(page: string) {
    const pagePath = normalizePagePath(page);
    const fullPagePath = join(this.serverDistDir, 'pages', `${pagePath}.html`);
    return readAssetFileAsString(
      this.serverOptions.computeJs.assets,
      fullPagePath,
      this.dir
    );
  }
}
