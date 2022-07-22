import { ComputeJsNextRequest, ComputeJsNextResponse } from "./base-http/compute-js";
import RenderResult from "next/dist/server/render-result";
import type { PayloadOptions } from "next/dist/server/send-payload";
import { setRevalidateHeaders } from "next/dist/server/send-payload/revalidate-headers";
import { byteLength, generateETag } from "next/dist/server/api-utils/web";
import fresh from 'fresh';

export async function sendRenderResult({
  req,
  res,
  result,
  type,
  generateEtags,
  poweredByHeader,
  options,
}: {
  req: ComputeJsNextRequest
  res: ComputeJsNextResponse
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
    res.setHeader('X-Powered-By', 'Next.js')
  }

  const payload = result.isDynamic() ? null : result.toUnchunkedString()

  if (payload) {
    const etag = generateEtags ? await generateETag(payload) : undefined
    if (sendEtagResponse(req, res, etag)) {
      return
    }
  }

  if (!res.getHeader('Content-Type')) {
    res.setHeader(
      'Content-Type',
      type === 'json' ? 'application/json' : 'text/html; charset=utf-8'
    )
  }

  if (payload) {
    res.setHeader('Content-Length', String(byteLength(payload)))
  }

  if (options != null) {
    setRevalidateHeaders(res, options)
  }

  if (req.method === 'HEAD') {
    res.send();
  } else if (payload) {
    res.body(payload);
    res.send()
  } else {
    await pipeRenderResult(result, res);
  }
}


export function sendEtagResponse(
  req: ComputeJsNextRequest,
  res: ComputeJsNextResponse,
  etag: string | undefined
): boolean {
  if (etag) {
    /**
     * The server generating a 304 response MUST generate any of the
     * following header fields that would have been sent in a 200 (OK)
     * response to the same request: Cache-Control, Content-Location, Date,
     * ETag, Expires, and Vary. https://tools.ietf.org/html/rfc7232#section-4.1
     */
    res.setHeader('ETag', etag)
  }

  if (fresh(req.headers, { etag })) {
    res.statusCode = 304;
    res.body('');
    res.send();
    return true;
  }

  return false;
}

export async function pipeRenderResult(
  result: RenderResult,
  res: ComputeJsNextResponse,
) {
  if (typeof result._result === 'string') {
    throw new Error(
      'invariant: static responses cannot be piped. This is a bug in Next.js'
    );
  }

  const writer = res.destination.getWriter();

  const response = result._result;
  const reader = response.getReader()
  let fatalError = false

  try {
    while (true) {
      const { done, value } = await reader.read()

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
