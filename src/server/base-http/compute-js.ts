import type { IncomingMessage } from 'http';

import { NodeNextRequest, NodeNextResponse } from "next/dist/server/base-http/node";

export class ComputeJsNextRequest extends NodeNextRequest {
  constructor(req: IncomingMessage, public client: ClientInfo) {
    super(req);
  }
}
export class ComputeJsNextResponse extends NodeNextResponse {}
