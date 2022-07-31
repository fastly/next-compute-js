import { ComputeJsServerOptions } from "./common";
import { loadConfig } from "./config";
import { PHASE_PRODUCTION_SERVER } from "next/constants";
import NextComputeJsServer from "./next-compute-js-server";
import { ComputeJsNextRequest, ComputeJsNextResponse } from "./base-http/compute-js";

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

  async handleFetchEvent(event: FetchEvent) {
    const nextRequest = new ComputeJsNextRequest(event.request, event.client);
    const nextResponse = new ComputeJsNextResponse();

    const requestHandler = await this.getRequestHandler();
    await requestHandler(nextRequest, nextResponse);

    return await nextResponse.toResponse();
  }

}

export default async function createServer(
  options: ComputeJsServerOptions
) {
  const server = new NextServer(options);
  await server.getServer(); // In C@E there is no sense in lazy loading this
  return server;
}
