/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import type { IncomingMessage, ServerResponse } from 'http';

import { Assets } from './common';
import { getAssetContentType, readAssetFile } from './require';

/**
 * Serves the contents of a file at a path.
 * (A reimplementation for Compute@Edge of function in Next.js of the same name,
 * found at next/server/serve-static.ts)
 */
export function serveStatic(
  assets: Assets,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  dir: string,
): Promise<void> {

  const decodedPath = decodeURIComponent(path);
  const asset = readAssetFile(assets, decodedPath, dir);

  if(!res.getHeader('Content-Type')) {
    const contentType = getAssetContentType(assets, decodedPath, dir);
    res.setHeader('Content-Type', contentType);
  }

  return new Promise(resolve => {
    res.end(asset, () => resolve());
  });
}
