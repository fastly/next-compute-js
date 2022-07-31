import { ComputeJsServerOptions } from "./common";
import { loadConfig } from "./config";
import { PHASE_PRODUCTION_SERVER } from "next/constants";
import NextComputeJsServer from "./next-compute-js-server";

export default function createServer(options: ComputeJsServerOptions) {

  const conf = loadConfig(
    PHASE_PRODUCTION_SERVER,
    options.dir ?? '.',
    options.conf,
  );

  console.log({conf});

  return new NextComputeJsServer({
    ...options,
    conf,
  });

}
