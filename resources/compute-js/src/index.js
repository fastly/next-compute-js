/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types="@fastly/js-compute" />

import createServer from "@fastly/next-compute-js";

import { assets } from './statics';

const server = await createServer({
  dir: '../../',
  computeJs: {
    assets,
    backends: {
      'httpbin': { url: 'https://httpbin.org/anything/' },
    },
  }
});

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));
async function handleRequest(event) {
  return await server.handleFetchEvent(event);
}
