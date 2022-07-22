import { join, relative } from 'path';
import {
  APP_PATHS_MANIFEST,
  FONT_MANIFEST,
  PAGES_MANIFEST,
  SERVER_DIRECTORY,
  SERVERLESS_DIRECTORY
} from "next/constants";
import { PagesManifest } from "next/dist/build/webpack/plugins/pages-manifest-plugin";
import { Assets } from "./common";
import { denormalizePagePath } from "next/dist/shared/lib/page-path/denormalize-page-path";
import { normalizePagePath } from "next/dist/shared/lib/page-path/normalize-page-path";
import { MissingStaticPage, PageNotFoundError } from "next/dist/shared/lib/utils";
import { normalizeLocalePath } from "next/dist/shared/lib/i18n/normalize-locale-path";

export function getPagePath(
  assets: Assets,
  page: string,
  dir: string,
  distDir: string,
  serverless: boolean,
  dev?: boolean,
  locales?: string[],
  appDirEnabled?: boolean
): string {
  const serverBuildPath = join(
    distDir,
    serverless && !dev ? SERVERLESS_DIRECTORY : SERVER_DIRECTORY
  )
  let rootPathsManifest: undefined | PagesManifest

  if (appDirEnabled) {
    rootPathsManifest = readAssetManifest(
      assets,
      join(serverBuildPath, APP_PATHS_MANIFEST),
      dir
    );
  }
  const pagesManifest = readAssetManifest(
    assets,
    join(serverBuildPath, PAGES_MANIFEST),
    dir
  ) as PagesManifest;

  try {
    page = denormalizePagePath(normalizePagePath(page))
  } catch (err) {
    console.error(err)
    throw new PageNotFoundError(page)
  }

  const checkManifest = (manifest: PagesManifest) => {
    let curPath = manifest[page]

    if (!manifest[curPath] && locales) {
      const manifestNoLocales: typeof pagesManifest = {}

      for (const key of Object.keys(manifest)) {
        manifestNoLocales[normalizeLocalePath(key, locales).pathname] =
          pagesManifest[key]
      }
      curPath = manifestNoLocales[page]
    }
    return curPath
  }
  let pagePath: string | undefined

  if (rootPathsManifest) {
    pagePath = checkManifest(rootPathsManifest)
  }

  if (!pagePath) {
    pagePath = checkManifest(pagesManifest)
  }

  if (!pagePath) {
    throw new PageNotFoundError(page)
  }
  return join(serverBuildPath, pagePath)
}

export function assetDirectoryExists(
  assets: Assets,
  path: string,
  dir: string,
): boolean {
  const relativePath = relative(dir, path);
  return Object.keys(assets).some(key => key.startsWith('/' + relativePath + '/'));
}

export function assetDirectory(
  assets: Assets,
  path: string,
  dir: string,
): string[] {
  const relativePath = relative(dir, path);
  return Object.keys(assets)
    .filter(key => key.startsWith('/' + relativePath + '/'));
}

export function assetFileExists(
  assets: Assets,
  path: string,
  dir: string
) {
  const relativePath = relative(dir, path);
  return '/' + relativePath in assets;
}

export function readAssetFile(
  assets: Assets,
  path: string,
  dir: string,
) {
  const relativePath = relative(dir, path);
  const file = assets['/' + relativePath];
  return file.content;
}

export function getAssetContentType(
  assets: Assets,
  path: string,
  dir: string,
) {
  const relativePath = relative(dir, path);
  const file = assets['/' + relativePath];
  return file.contentType;
}

export function readAssetManifest(
  assets: Assets,
  path: string,
  dir: string,
) {
  let content = readAssetFile(assets, path, dir);
  if(typeof content !== 'string') {
    content = content.toString('utf8');
  }
  return JSON.parse(content);
}

export function readAssetModule(
  assets: Assets,
  path: string,
  dir: string,
) {
  const relativePath = relative(dir, path);
  const file = assets['/' + relativePath];
  return file.module;
}

export async function requirePage(
  assets: Assets,
  page: string,
  dir: string,
  distDir: string,
  serverless: boolean,
  appDirEnabled?: boolean
): Promise<any> {
  const pagePath = getPagePath(
    assets,
    page,
    dir,
    distDir,
    serverless,
    false,
    undefined,
    appDirEnabled
  )
  if (pagePath.endsWith('.html')) {
    try {
      let content = readAssetFile(assets, pagePath, dir);
      if(typeof content !== 'string') {
        content = content.toString('utf8');
      }
      return content;
    } catch(err) {
      throw new MissingStaticPage(page, err.message)
    }
  }
  return readAssetModule(assets, pagePath, dir);
}

export function requireFontManifest(
  assets: Assets,
  distDir: string,
  dir: string,
  serverless: boolean,
) {
  const serverBuildPath = join(
    distDir,
    serverless ? SERVERLESS_DIRECTORY : SERVER_DIRECTORY
  )
  return readAssetManifest(
    assets,
    join(serverBuildPath, FONT_MANIFEST),
    dir,
  );
}
