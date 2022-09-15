/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import type { IncomingMessage } from 'http';

import { toComputeResponse, toReqRes } from '@fastly/http-compute-js';
import { PHASE_PRODUCTION_SERVER } from 'next/constants';

import { ComputeJsNextRequest, ComputeJsNextResponse } from './base-http/compute-js';
import { ComputeJsServerOptions } from './common';
import { loadConfig } from './config';
import NextComputeJsServer from './next-compute-js-server';

export class NextServer {
  public options: ComputeJsServerOptions;
  public server: NextComputeJsServer | null;

  constructor(options: ComputeJsServerOptions) {
    this.options = options;
    this.server = null;
  }

  async getServer() {
    if(this.server != null) {
      return this.server;
    }
    const conf = await loadConfig(
      PHASE_PRODUCTION_SERVER,
      this.options.computeJs.assets,
      this.options.dir ?? '.',
      this.options.conf,
    );

    this.server = new NextComputeJsServer({
      ...this.options,
      conf,
    });

    return this.server;
  }

  async getRequestHandler() {
    return (await this.getServer())
      .getRequestHandler();
  }

  getUpgradeHandler() {
    return async (req: IncomingMessage, socket: any, head: any) => {
      throw new Error("Upgrading not supported");
    };
  }

  async handleFetchEvent(event: FetchEvent) {
    const { req, res } = toReqRes(event.request);

    const nextRequest = new ComputeJsNextRequest(req, event.client);
    const nextResponse = new ComputeJsNextResponse(res);

    const requestHandler = await this.getRequestHandler();
    await requestHandler(nextRequest, nextResponse);

    // If the handler has set a response directly, then use it
    if(nextResponse.overrideResponse != null) {
      return nextResponse.overrideResponse;
    }

    return await toComputeResponse(res);
  }

}

export default async function createServer(
  options: ComputeJsServerOptions
) {
  const server = new NextServer(options);
  await server.getServer(); // In C@E there is no sense in lazy loading this
  return server;
}
