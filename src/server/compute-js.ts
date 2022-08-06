import bytes from 'bytes';
import { Buffer } from 'buffer';
import type { Env } from '@next/env';
import {
  RESPONSE_LIMIT_DEFAULT,
  __ApiPreviewProps,
  getCookieParser,
  redirect,
  sendStatusCode,
  clearPreviewData,
  ApiError,
  sendError,
  COOKIE_NAME_PRERENDER_BYPASS,
  COOKIE_NAME_PRERENDER_DATA,
  SYMBOL_PREVIEW_DATA, NextApiRequestCookies,
} from "next/dist/server/api-utils";
import { Backends } from "./common";
import { ComputeJsNextRequest, ComputeJsNextResponse } from "./base-http/compute-js";
import { NextApiRequest, NextApiResponse, PageConfig, PreviewData } from "next";
import { interopDefault } from "next/dist/lib/interop-default";
import {
  ComputeJsIncomingMessage,
  ComputeJsServerResponse,
  toReqRes
} from "@fastly/http-compute-js";
import { Stream } from "stream";
import { generateETag, sendEtagResponse } from "./send-payload";
import { isResSent } from "next/dist/shared/lib/utils";
import isError from "next/dist/lib/is-error";
import { encryptWithSecret, decryptWithSecret } from "next/dist/server/crypto-utils";
import jsonwebtoken from 'jsonwebtoken';
import { CookieSerializeOptions } from "next/dist/server/web/types";
import { serialize } from 'cookie';
import { IncomingMessage, ServerResponse } from "http";
import getRawBody from 'raw-body';
import { parse } from 'content-type';

export type BackendInfo = {
  name: string,
  url: string,
  target: string,
};

function findBackendInfo(backends: Backends, url: string): BackendInfo | null {
  for (const [backendName, backend] of Object.entries(backends)) {
    let backendUrl = typeof backend === 'string' ? backend : backend.url;
    if(!backendUrl.endsWith('/')) {
      backendUrl += '/';
    }
    if(url.startsWith(backendUrl)) {
      return {
        name: backendName,
        url: backendUrl,
        target: '/' + url.slice(backendUrl.length),
      };
    }
  }
  return null;
}

export function getBackendInfo(backends: Backends | undefined, url: string) {
  if(backends == null) {
    return null;
  }

  let backendName;

  const urlObj = new URL(url);
  if(urlObj.port === '') {
    // If port is not specified, try the default port
    if (urlObj.protocol === 'https:') {
      urlObj.port = '443';
    } else {
      urlObj.port = '80';
    }
    backendName = findBackendInfo(backends, String(urlObj));
  }
  if(backendName == null) {
    backendName = findBackendInfo(backends, url);
  }

  return backendName;
}

class ComputeJsNextApiRequest extends ComputeJsIncomingMessage implements NextApiRequest {
  constructor(ctx: any) {
    super();

    this.query = ctx.query;
  }

  body: any;

  get env(): Env {
    throw new Error('env not implemented');
  }
  set env(val: Env) {
    throw new Error('env not implemented');
  }

  _cookiesGetterCalled: boolean = false;
  _cookies?: Partial<{ [p: string]: string }>;
  get cookies(): Partial<{ [p: string]: string }> {
    if(!this._cookiesGetterCalled) {
      this._cookiesGetterCalled = true;
      this._cookies = getCookieParser(this.headers)();
    }
    return this._cookies!;
  }
  set cookies(val: Partial<{ [p: string]: string }>) {
    this._cookiesGetterCalled = true;
    this._cookies = val;
  }

  query: Partial<{ [p: string]: string | string[] }>;

  _res!: ComputeJsServerResponse;
  _apiContext!: ApiContext;
  _previewDataGetterCalled: boolean = false;
  _previewData?: PreviewData;
  get previewData(): PreviewData {
    if(!this._previewDataGetterCalled) {
      this._previewDataGetterCalled = true;
      this._previewData = tryGetPreviewData(this, this._res, this._apiContext);
    }
    return this._previewData!;
  }

  set previewData(val: PreviewData) {
    this._previewDataGetterCalled = true;
    this._previewData = val;
  }

  _previewGetterCalled: boolean = false;
  _preview?: boolean;
  get preview(): boolean {
    if(!this._previewGetterCalled) {
      this._previewGetterCalled = true;
      this._preview = this.previewData !== false ? true : undefined;
    }
    return this._preview!;
  }
}

class ComputeJsNextApiResponse<T = any> extends ComputeJsServerResponse implements NextApiResponse<T> {
  constructor(req: ComputeJsNextApiRequest) {
    super(req);
  }

  _apiContext!: ApiContext;
  _responseLimit!: boolean;
  _maxContentLength: number = 0;
  __contentLength: number = 0;
  override write(chunk: any, encoding?: any, callback?: any): boolean {
    this.__contentLength += Buffer.byteLength(chunk || '');
    return super.write(chunk, encoding, callback);
  }

  override end(chunk?: any, encoding?: any, callback?: any): this {
    if (typeof chunk !== 'function') {
      this.__contentLength += Buffer.byteLength(chunk || '')
    }

    if (this._responseLimit && this.__contentLength >= this._maxContentLength) {
      console.warn(
        `API response for ${this.req.url} exceeds ${bytes.format(
          this._maxContentLength
        )}. API Routes are meant to respond quickly. https://nextjs.org/docs/messages/api-routes-response-size-limit`
      )
    }

    return super.end(chunk, encoding, callback);
  }

  status(statusCode: number): NextApiResponse<T> {
    return sendStatusCode(this, statusCode);
  }

  send(body: any): void {
    return sendData(this.req as ComputeJsNextApiRequest, this, body)
  }

  redirect(statusOrUrl: number | string, url?: string): NextApiResponse<T> {
    return redirect(this, statusOrUrl, url);
  }

  setPreviewData(data: object | string, options?: { maxAge?: number }): NextApiResponse<T> {
    return setPreviewData(this, data, Object.assign({}, this._apiContext, options));
  }

  clearPreviewData(): NextApiResponse<T> {
    return clearPreviewData(this);
  }

  json(body: any): void {
    return sendJson(this, body);
  }

  revalidate(urlPath: string, opts: { unstable_onlyGenerated?: boolean } | undefined): Promise<void> {
    // TODO: When we do revalidation
    // apiRes.revalidate = (
    //   urlPath: string,
    //   opts?: {
    //     unstable_onlyGenerated?: boolean
    //   }
    // ) => revalidate(urlPath, opts || {}, req, apiContext)
    return Promise.resolve();
  }

  unstable_revalidate(): void {
    // TODO: Upstream will remove in next minor (current v12.2)
    throw new Error(
      `"unstable_revalidate" has been renamed to "revalidate" see more info here: https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration#on-demand-revalidation`
    );
  }

}

export function tryGetPreviewData(
  req: IncomingMessage,
  res: ServerResponse,
  options: __ApiPreviewProps
): PreviewData {
  // Read cached preview data if present
  if (SYMBOL_PREVIEW_DATA in req) {
    return (req as any)[SYMBOL_PREVIEW_DATA] as any
  }

  const getCookies = getCookieParser(req.headers)
  let cookies: NextApiRequestCookies
  try {
    cookies = getCookies()
  } catch {
    // TODO: warn
    return false
  }

  const hasBypass = COOKIE_NAME_PRERENDER_BYPASS in cookies
  const hasData = COOKIE_NAME_PRERENDER_DATA in cookies

  // Case: neither cookie is set.
  if (!(hasBypass || hasData)) {
    return false
  }

  // Case: one cookie is set, but not the other.
  if (hasBypass !== hasData) {
    clearPreviewData(res as NextApiResponse)
    return false
  }

  // Case: preview session is for an old build.
  if (cookies[COOKIE_NAME_PRERENDER_BYPASS] !== options.previewModeId) {
    clearPreviewData(res as NextApiResponse)
    return false
  }

  const tokenPreviewData = cookies[COOKIE_NAME_PRERENDER_DATA] as string

  let encryptedPreviewData: {
    data: string
  }
  try {
    encryptedPreviewData = jsonwebtoken.verify(
      tokenPreviewData,
      options.previewModeSigningKey
    ) as typeof encryptedPreviewData
  } catch {
    // TODO: warn
    clearPreviewData(res as NextApiResponse)
    return false
  }

  const decryptedPreviewData = decryptWithSecret(
    Buffer.from(options.previewModeEncryptionKey),
    encryptedPreviewData.data
  )

  try {
    // TODO: strict runtime type checking
    const data = JSON.parse(decryptedPreviewData)
    // Cache lookup
    Object.defineProperty(req, SYMBOL_PREVIEW_DATA, {
      value: data,
      enumerable: false,
    })
    return data
  } catch {
    return false
  }
}

/**
 * Parse incoming message like `json` or `urlencoded`
 * @param req request object
 */
export async function parseBody(
  req: IncomingMessage,
  limit: string | number
): Promise<any> {
  let contentType
  try {
    contentType = parse(req.headers['content-type'] || 'text/plain')
  } catch {
    contentType = parse('text/plain')
  }
  const { type, parameters } = contentType
  const encoding = parameters.charset || 'utf-8'

  let buffer

  try {
    buffer = await getRawBody(req, { encoding, limit })
  } catch (e) {
    if (isError(e) && e.type === 'entity.too.large') {
      throw new ApiError(413, `Body exceeded ${limit} limit`)
    } else {
      throw new ApiError(400, 'Invalid body')
    }
  }

  const body = buffer.toString()

  if (type === 'application/json' || type === 'application/ld+json') {
    return parseJson(body)
  } else if (type === 'application/x-www-form-urlencoded') {
    const qs = require('querystring')
    return qs.decode(body)
  } else {
    return body
  }
}

type ApiContext = __ApiPreviewProps & {
  trustHostHeader?: boolean
  revalidate?: (_req: ComputeJsNextRequest, _res: ComputeJsNextResponse) => Promise<any>
}

export async function apiResolver(
  req: ComputeJsNextRequest,
  res: ComputeJsNextResponse,
  query: any,
  resolverModule: any,
  apiContext: ApiContext,
  propagateError: boolean,
  dev?: boolean,
  page?: string
): Promise<void> {

  const { req: apiReq, res: apiRes } = toReqRes(req.request, {
    createIncomingMessage: (ctx) => new ComputeJsNextApiRequest(ctx),
    createServerResponse: (req) => new ComputeJsNextApiResponse(req as ComputeJsNextApiRequest),
    ctx: {
      query,
    },
  }) as unknown as { req: ComputeJsNextApiRequest, res: ComputeJsNextApiResponse };

  try {
    if (!resolverModule) {
      res.statusCode = 404;
      res.body('Not Found');
      res.send();
      return
    }
    const config: PageConfig = resolverModule.config || {}
    const bodyParser = config.api?.bodyParser !== false
    const responseLimit = config.api?.responseLimit ?? true
    const externalResolver = config.api?.externalResolver || false

    apiReq._res = apiRes as ComputeJsServerResponse;
    apiReq._apiContext = apiContext;

    // Parsing of body
    if (bodyParser && !apiReq.body) {
      apiReq.body = await parseBody(
        apiReq,
        config.api && config.api.bodyParser && config.api.bodyParser.sizeLimit
          ? config.api.bodyParser.sizeLimit
          : '1mb'
      );
    }

    apiRes._apiContext = apiContext;
    apiRes._responseLimit = Boolean(responseLimit);
    apiRes._maxContentLength = getMaxContentLength(responseLimit);

    const resolver = interopDefault(resolverModule);
    let wasPiped = false;

    // Call API route method
    await resolver(apiReq, apiRes);

    if (
      process.env.NODE_ENV !== 'production' &&
      !externalResolver &&
      !isResSent(apiRes) &&
      !wasPiped
    ) {
      console.warn(
        `API resolved without sending a response for ${req.url}, this may result in stalled requests.`
      )
    }
  } catch (err) {
    if (err instanceof ApiError) {
      sendError(apiRes, err.statusCode, err.message)
    } else {
      if (dev) {
        if (isError(err)) {
          err.page = page
        }
        throw err
      }

      console.error(err)
      if (propagateError) {
        throw err
      }
      sendError(apiRes, 500, 'Internal Server Error')
    }
  }
}

/**
 * Parse `JSON` and handles invalid `JSON` strings
 * @param str `JSON` string
 */
function parseJson(str: string): object {
  if (str.length === 0) {
    // special-case empty json body, as it's a common client-side mistake
    return {}
  }

  try {
    return JSON.parse(str)
  } catch (e) {
    throw new ApiError(400, 'Invalid JSON')
  }
}

/**
 * Send `any` body to response
 * @param req request object
 * @param res response object
 * @param body of response
 */
function sendData(req: ComputeJsNextApiRequest, res: ComputeJsNextApiResponse, body: any): void {
  if (body === null || body === undefined) {
    res.end();
    return;
  }

  // strip irrelevant headers/body
  if (res.statusCode === 204 || res.statusCode === 304) {
    res.removeHeader('Content-Type');
    res.removeHeader('Content-Length');
    res.removeHeader('Transfer-Encoding');

    if (process.env.NODE_ENV === 'development' && body) {
      console.warn(
        `A body was attempted to be set with a 204 statusCode for ${req.url}, this is invalid and the body was ignored.\n` +
        `See more info here https://nextjs.org/docs/messages/invalid-api-status-body`
      );
    }
    res.end();
    return
  }

  const contentType = res.getHeader('Content-Type')

  if (body instanceof Stream) {
    if (!contentType) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    body.pipe(res);
    return
  }

  const isJSONLike = ['object', 'number', 'boolean'].includes(typeof body);
  const stringifiedBody = isJSONLike ? JSON.stringify(body) : body;
  const etag = generateETag(stringifiedBody);
  if (sendEtagResponse(req, res, etag)) {
    return;
  }

  if (Buffer.isBuffer(body)) {
    if (!contentType) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    res.setHeader('Content-Length', body.length);
    res.end(body);
    return
  }

  if (isJSONLike) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  res.setHeader('Content-Length', Buffer.byteLength(stringifiedBody));
  res.end(stringifiedBody);
}

/**
 * Send `JSON` object
 * @param res response object
 * @param jsonBody of data
 */
function sendJson(res: ComputeJsNextApiResponse, jsonBody: any): void {
  // Set header to application/json
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Use send to handle request
  res.send(JSON.stringify(jsonBody));
}

function isNotValidData(str: string): boolean {
  return typeof str !== 'string' || str.length < 16
}

function setPreviewData<T>(
  res: NextApiResponse<T>,
  data: object | string, // TODO: strict runtime type checking
  options: {
    maxAge?: number
  } & __ApiPreviewProps
): NextApiResponse<T> {
  if (isNotValidData(options.previewModeId)) {
    throw new Error('invariant: invalid previewModeId')
  }
  if (isNotValidData(options.previewModeEncryptionKey)) {
    throw new Error('invariant: invalid previewModeEncryptionKey')
  }
  if (isNotValidData(options.previewModeSigningKey)) {
    throw new Error('invariant: invalid previewModeSigningKey')
  }

  const payload = jsonwebtoken.sign(
    {
      data: encryptWithSecret(
        Buffer.from(options.previewModeEncryptionKey),
        JSON.stringify(data)
      ),
    },
    options.previewModeSigningKey,
    {
      algorithm: 'HS256',
      ...(options.maxAge !== undefined
        ? { expiresIn: options.maxAge }
        : undefined),
    }
  )

  // limit preview mode cookie to 2KB since we shouldn't store too much
  // data here and browsers drop cookies over 4KB
  if (payload.length > 2048) {
    throw new Error(
      `Preview data is limited to 2KB currently, reduce how much data you are storing as preview data to continue`
    )
  }

  const previous = res.getHeader('Set-Cookie')
  res.setHeader(`Set-Cookie`, [
    ...(typeof previous === 'string'
      ? [previous]
      : Array.isArray(previous)
        ? previous
        : []),
    serialize(COOKIE_NAME_PRERENDER_BYPASS, options.previewModeId, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV !== 'development' ? 'none' : 'lax',
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      ...(options.maxAge !== undefined
        ? ({ maxAge: options.maxAge } as CookieSerializeOptions)
        : undefined),
    }),
    serialize(COOKIE_NAME_PRERENDER_DATA, payload, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV !== 'development' ? 'none' : 'lax',
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      ...(options.maxAge !== undefined
        ? ({ maxAge: options.maxAge } as CookieSerializeOptions)
        : undefined),
    }),
  ]);
  return res;
}

function getMaxContentLength(responseLimit?: number | string | boolean) {
  if (responseLimit && typeof responseLimit !== 'boolean') {
    return bytes.parse(responseLimit);
  }
  return RESPONSE_LIMIT_DEFAULT;
}

