/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import accepts from 'accepts';

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
  compress: boolean,
): Promise<void> {

  const decodedPath = decodeURIComponent(path);
  const asset = readAssetFile(assets, decodedPath, dir);
  const contentType = getAssetContentType(assets, decodedPath, dir);

  let response = new Response(asset, {
    status: 200,
    headers: {
      'Content-Type': contentType,
    },
  });

  if(compress) {
    const accept = accepts(req.originalRequest);
    const encoding = accept.encodings(['gzip', 'deflate']) as 'gzip' | 'deflate' | false;
    if (encoding) {
      response = new Response(
        response.body!.pipeThrough(new CompressionStream(encoding)),
        {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Encoding': encoding,
          },
        }
      );
    }
  }

  res.overrideResponse = response;
}
