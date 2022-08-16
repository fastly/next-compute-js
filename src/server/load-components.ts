/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 *
 * Portions of this file Copyright Vercel, Inc., licensed under the MIT license. See LICENSE file for details.
 */

import { join } from 'path';

import { BUILD_MANIFEST, FLIGHT_MANIFEST, NEXT_CLIENT_SSR_ENTRY_SUFFIX, REACT_LOADABLE_MANIFEST } from 'next/constants';
import { interopDefault } from 'next/dist/lib/interop-default';
import { LoadComponentsReturnType } from 'next/dist/server/load-components';
import { normalizePagePath } from 'next/dist/shared/lib/page-path/normalize-page-path';

import { Assets } from './common';
import { getPagePath, readAssetManifest, requirePage } from './require';

/**
 * Loads React component associated with a given pathname.
 * (An adaptation for Compute@Edge of function in Next.js of the same name,
 * found at next/server/load-components.ts)
 */
export async function loadComponents(
  assets: Assets,
  distDir: string,
  pathname: string,
  dir: string,
  serverless: boolean,
  hasServerComponents?: boolean,
  appDirEnabled?: boolean
): Promise<LoadComponentsReturnType> {
  if (serverless) {
    return {
      pageConfig: {},
      buildManifest: {} as any,
      reactLoadableManifest: {} as any,
      App: () => 'App',
      Component: () => 'Component',
      Document: () => 'Document',
      ComponentMod: () => 'ComponentMod',
    };
  }

  const [DocumentMod, AppMod, ComponentMod] = await Promise.all([
    Promise.resolve().then(() =>
      requirePage(assets, '/_document', dir, distDir, serverless, appDirEnabled)
    ),
    Promise.resolve().then(() =>
      requirePage(assets, '/_app', dir, distDir, serverless, appDirEnabled)
    ),
    Promise.resolve().then(() =>
      requirePage(assets, pathname, dir, distDir, serverless, appDirEnabled)
    ),
  ]);

  const [buildManifest, reactLoadableManifest, serverComponentManifest] = await Promise.all([
    readAssetManifest(assets, join(distDir, BUILD_MANIFEST), dir),
    readAssetManifest(assets, join(distDir, REACT_LOADABLE_MANIFEST), dir),
    hasServerComponents
      ? readAssetManifest(assets, join(distDir, 'server', FLIGHT_MANIFEST + '.json'), dir)
      : null,
  ]);

  if (hasServerComponents) {
    try {
      // Make sure to also load the client entry in cache.
      const __client__ = await requirePage(
        assets,
        normalizePagePath(pathname) + NEXT_CLIENT_SSR_ENTRY_SUFFIX,
        dir,
        distDir,
        serverless,
        appDirEnabled
      );
      ComponentMod.__client__ = __client__;
    } catch (_) {
      // This page might not be a server component page, so there is no
      // client entry to load.
    }
  }

  const Component = interopDefault(ComponentMod);
  const Document = interopDefault(DocumentMod);
  const App = interopDefault(AppMod);

  const { getServerSideProps, getStaticProps, getStaticPaths } = ComponentMod;

  let isAppPath = false;

  if (appDirEnabled) {
    const pagePath = getPagePath(
      assets,
      pathname,
      dir,
      distDir,
      serverless,
      false,
      undefined,
      appDirEnabled
    );
    isAppPath = !!pagePath?.match(/server[/\\]app[/\\]/);
  }

  return {
    App,
    Document,
    Component,
    buildManifest,
    reactLoadableManifest,
    pageConfig: ComponentMod.config || {},
    ComponentMod,
    getServerSideProps,
    getStaticProps,
    getStaticPaths,
    serverComponentManifest,
    isAppPath,
  };
}
