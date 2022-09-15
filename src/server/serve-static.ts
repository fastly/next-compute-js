/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import type { ServerResponse } from 'http';

import { Assets } from './common';
import { getAssetContentType, readAssetFile } from './require';
import { ComputeJsNextRequest, ComputeJsNextResponse } from "./base-http/compute-js";

/**
 * Serves the contents of a file at a path.
 * (A reimplementation for Compute@Edge of function in Next.js of the same name,
 * found at next/server/serve-static.ts)
 */
export async function serveStatic(
  assets: Assets,
  req: ComputeJsNextRequest,
  res: ComputeJsNextResponse,
  path: string,
  dir: string,
): Promise<void> {

  const decodedPath = decodeURIComponent(path);
  const asset = readAssetFile(assets, decodedPath, dir);

  if(!(res.originalResponse as ServerResponse).getHeader('Content-Type')) {
    const contentType = getAssetContentType(assets, decodedPath, dir);
    (res.originalResponse as ServerResponse).setHeader('Content-Type', contentType);
  }

  return new Promise(resolve => {
    (res.originalResponse as ServerResponse).end(asset, () => resolve());
  });

}
