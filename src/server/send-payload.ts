import { Buffer } from 'buffer';
import crypto from 'crypto';

import { ComputeJsIncomingMessage, ComputeJsServerResponse } from '@fastly/http-compute-js';
import fresh from 'fresh';
import RenderResult from 'next/dist/server/render-result';
import type { PayloadOptions } from 'next/dist/server/send-payload';
import { setRevalidateHeaders } from 'next/dist/server/send-payload/revalidate-headers';

import { ComputeJsNextRequestPrev, ComputeJsNextResponsePrev } from './base-http/compute-js';

// Calculate the ETag for a payload.
export function generateETag(payload: string) {
  if (payload.length === 0) {
    // fast-path empty
    return '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"'
  }

  // compute hash of entity
  const hash = crypto
    .createHash('sha1')
    .update(payload, 'utf8')
    .digest('base64')
    .substring(0, 27)

  // compute length of entity
  const len = Buffer.byteLength(payload)

  return '"' + len.toString(16) + '-' + hash + '"'
}

export async function sendRenderResult({
  req,
  res,
  result,
  type,
  generateEtags,
  poweredByHeader,
  options,
}: {
  req: ComputeJsNextRequestPrev
  res: ComputeJsNextResponsePrev
  result: RenderResult
  type: 'html' | 'json'
  generateEtags: boolean
  poweredByHeader: boolean
  options?: PayloadOptions
}): Promise<void> {
  if (res.sent) {
    return;
  }

  if (poweredByHeader && type === 'html') {
    res.setHeader('X-Powered-By', 'Next.js');
  }

  const payload = result.isDynamic() ? null : result.toUnchunkedString();

  if (payload) {
    const etag = generateEtags ? generateETag(payload) : undefined;
    if (sendEtagResponse(req, res, etag)) {
      return;
    }
  }

  if (!res.getHeader('Content-Type')) {
    res.setHeader(
      'Content-Type',
      type === 'json' ? 'application/json' : 'text/html; charset=utf-8'
    );
  }

  if (payload) {
    res.setHeader('Content-Length', String(Buffer.byteLength(payload)));
  }

  if (options != null) {
    setRevalidateHeaders(res, options);
  }

  if (req.method === 'HEAD') {
    res.send();
  } else if (payload) {
    res.body(payload);
    res.send();
  } else {
    await pipeRenderResult(result, res);
  }
}

export function sendEtagResponse(
  req: ComputeJsNextRequestPrev | ComputeJsIncomingMessage,
  res: ComputeJsNextResponsePrev | ComputeJsServerResponse,
  etag: string | undefined
): boolean {
  if (etag) {
    /**
     * The server generating a 304 response MUST generate any of the
     * following header fields that would have been sent in a 200 (OK)
     * response to the same request: Cache-Control, Content-Location, Date,
     * ETag, Expires, and Vary. https://tools.ietf.org/html/rfc7232#section-4.1
     */
    res.setHeader('ETag', etag);
  }

  if (fresh(req.headers, { etag })) {
    res.statusCode = 304;
    if(res instanceof ComputeJsNextResponsePrev) {
      res.body(null);
      res.send();
    } else {
      res.end();
    }
    return true;
  }

  return false;
}

export async function pipeRenderResult(
  result: RenderResult,
  res: ComputeJsNextResponsePrev,
) {
  if (typeof result._result === 'string') {
    throw new Error(
      'invariant: static responses cannot be piped. This is a bug in Next.js'
    );
  }

  const writer = res.destination.getWriter();

  const response = result._result;
  const reader = response.getReader();
  let fatalError = false;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        res.send();
        return;
      }

      fatalError = true;
      await writer.write(value);
    }
  } catch (err) {
    if (fatalError) {
      await writer.abort(err as any);
    }
    throw err;
  }
}
