/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 *
 * Portions of this file Copyright Vercel, Inc., licensed under the MIT license. See LICENSE file for details.
 */

import { join } from 'path';

import { BUILD_MANIFEST, FLIGHT_MANIFEST, REACT_LOADABLE_MANIFEST } from 'next/constants';
import { interopDefault } from 'next/dist/lib/interop-default';
import { LoadComponentsReturnType } from 'next/dist/server/load-components';

import { Assets } from './common';
import { readAssetManifest, requirePage } from './require';

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
  hasServerComponents: boolean,
  isAppPath: boolean
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

  let DocumentMod = {};
  let AppMod = {};
  if (!isAppPath) {
    [DocumentMod, AppMod] = await Promise.all([
      Promise.resolve().then(() =>
        requirePage(assets, '/_document', dir, distDir, serverless, false)
      ),
      Promise.resolve().then(() =>
        requirePage(assets, '/_app', dir, distDir, serverless, false)
      ),
    ]);
  }

  const ComponentMod = await Promise.resolve().then(() =>
    requirePage(assets, pathname, dir, distDir, serverless, isAppPath)
  );

  const [buildManifest, reactLoadableManifest, serverComponentManifest] = await Promise.all([
    readAssetManifest(assets, join(distDir, BUILD_MANIFEST), dir),
    readAssetManifest(assets, join(distDir, REACT_LOADABLE_MANIFEST), dir),
    hasServerComponents
      ? readAssetManifest(assets, join(distDir, 'server', FLIGHT_MANIFEST + '.json'), dir)
      : null,
  ]);

  const Component = interopDefault(ComponentMod);
  const Document = interopDefault(DocumentMod);
  const App = interopDefault(AppMod);

  const { getServerSideProps, getStaticProps, getStaticPaths } = ComponentMod;

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
