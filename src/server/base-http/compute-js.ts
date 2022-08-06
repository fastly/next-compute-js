import { Buffer } from 'buffer';
import type { IncomingHttpHeaders } from 'http';

import { BaseNextRequest, BaseNextResponse } from 'next/dist/server/base-http';

export class ComputeJsNextRequest extends BaseNextRequest<ReadableStream | null> {
  public request: Request;
  public clientInfo: ClientInfo;
  public headers: IncomingHttpHeaders;

  public constructor(request: Request, clientInfo: ClientInfo) {
    const url = new URL(request.url);

    super(
      request.method,
      url.href.slice(url.origin.length),
      request.body, // We want to use request.clone().body here.
    );
    // request.clone() will be available in upcoming js-compute-runtime version.
    // The dependency at the moment will be Next.js <= 12.2.2
    // until request.clone() works.
    this.request = request;
    this.clientInfo = clientInfo;

    this.headers = {};
    for (const [name, value] of request.headers.entries()) {
      this.headers[name] = value;
    }
  }

  async parseBody(limit: string | number): Promise<any> {
    throw new Error('parseBody is not implemented in the ComputeJs runtime');
  }
}

export class ComputeJsNextResponse extends BaseNextResponse<WritableStream> {
  private headers = new Headers();
  private bodyContent: string | Buffer | undefined = undefined;
  private _sent = false;
  private emptyBody = false;

  private _overwrittenResponse: Response | undefined = undefined;

  private sendPromise = new Promise<void>((resolve) => {
    this.sendResolve = resolve;
  })
  private sendResolve?: () => void;
  private response = this.sendPromise.then(() => {
    if (this._overwrittenResponse != null) {
      return this._overwrittenResponse;
    }
    let body: BodyInit = null;
    if(!this.emptyBody) {
      body = this.bodyContent ?? this.transformStream.readable;
    }
    return new Response(body, {
      headers: this.headers,
      status: this.statusCode,
      // statusMessage will be available in upcoming js-compute-runtime version.
      // statusText: this.statusMessage,
    });
  });

  public statusCode: number | undefined;
  public statusMessage: string | undefined;

  get sent() {
    return this._sent;
  }

  constructor(public transformStream = new TransformStream()) {
    super(transformStream.writable);
  }

  setHeader(name: string, value: string | string[]): this {
    this.headers.delete(name);
    for (const val of Array.isArray(value) ? value : [value]) {
      this.headers.append(name, val);
    }
    return this;
  }

  getHeaderValues(name: string): string[] | undefined {
    // https://developer.mozilla.org/en-US/docs/Web/API/Headers/get#example
    return this.getHeader(name)
      ?.split(',')
      .map((v) => v.trimStart());
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name) ?? undefined;
  }

  hasHeader(name: string): boolean {
    return this.headers.has(name);
  }

  appendHeader(name: string, value: string): this {
    this.headers.append(name, value);
    return this;
  }

  body(value: string | Buffer | null) {
    if(value == null) {
      this.emptyBody = true;
    } else {
      this.bodyContent = value;
    }
    return this;
  }

  send() {
    this.sendResolve?.();
    this._sent = true;
  }

  setComputeResponse(response: Response) {
    this._overwrittenResponse = response;
    this.send();
  }

  toResponse() {
    return this.response;
  }
}
