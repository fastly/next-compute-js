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

  const outgoingHeaders = new Headers();

  // Copy all the headers that have already been set on this response
  // for example those set by setImmutableAssetCacheControl()
  const nodeRes = res.originalResponse as ServerResponse;
  for (const [key, value] of Object.entries(nodeRes.getHeaders())) {
    if(value == null) {
      continue;
    }
    if(Array.isArray(value)) {
      for (const entry of value) {
        outgoingHeaders.append(key, entry);
      }
    } else {
      outgoingHeaders.append(key, String(value));
    }
  }

  if(!outgoingHeaders.has('Content-Type')) {
    outgoingHeaders.append('Content-Type',
      getAssetContentType(assets, decodedPath, dir)
    );
  }

  res.overrideResponse = new Response(asset, {
    status: 200,
    statusText: 'OK',
    headers: outgoingHeaders,
  });
}
