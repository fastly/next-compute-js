/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import type { IncomingMessage } from 'http';

import { NodeNextRequest, NodeNextResponse } from 'next/dist/server/base-http/node';

export class ComputeJsNextRequest extends NodeNextRequest {
  constructor(req: IncomingMessage, public client: ClientInfo) {
    super(req);
  }
}
export class ComputeJsNextResponse extends NodeNextResponse {
  // Whether to handle compression for this response
  compress?: boolean;

  // If this is set, then we use this response rather than
  // the response built through the buffer.
  overrideResponse?: Response;
}
