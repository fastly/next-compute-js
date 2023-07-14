/// <reference types="@fastly/js-compute" />

import VercelBuildOutputServer, {
  ComputeJsConsoleLoggerProvider,
  LogLevel,
  setLoggerProvider,
} from '@fastly/serve-vercel-build-output';
import { contentAssets, moduleAssets } from './statics';

const loggerProvider = new ComputeJsConsoleLoggerProvider(LogLevel.DEBUG);
setLoggerProvider(loggerProvider);

/** @type {import('@fastly/serve-vercel-build-output').ServerConfigInit} */
let serverConfig = null;
try {
  serverConfig = (await import('../server.config.js')).default;
} catch {
  console.warn('Unable to import server.config.js');
}

const vercelServer = new VercelBuildOutputServer({
  contentAssets,
  moduleAssets,
  serverConfig,
});
await vercelServer.initialize();
const requestHandler = vercelServer.createHandler();

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));
async function handleRequest(event) {
  return requestHandler(event);
}
