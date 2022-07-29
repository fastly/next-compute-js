/// <reference types="@fastly/js-compute" />

import "@fastly/next-compute-js/build/src/core";
import NextComputeJsServer from "@fastly/next-compute-js/build/src/server/next-compute-js-server";
import {
  ComputeJsNextRequest,
  ComputeJsNextResponse
} from "@fastly/next-compute-js/build/src/server/base-http/compute-js";

import {assets} from './statics';

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

const server = new NextComputeJsServer({
  dir: '../../',
  conf: {
    distDir: './.next/',
    experimental: {
      nextScriptWorkers: false,
      runtime: 'experimental-edge',
    },
    amp: {},
    publicRuntimeConfig: {},
    useFileSystemPublicRoutes: true,
  },
  computeJs: {
    assets,
  }
});

const requestHandler = server.getRequestHandler();

async function handleRequest(event) {
  const nextRequest = new ComputeJsNextRequest(event.request, event.client);
  const nextResponse = new ComputeJsNextResponse();

  await requestHandler(nextRequest, nextResponse);
  return await nextResponse.toResponse();
}
