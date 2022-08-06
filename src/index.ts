/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types="@fastly/js-compute" />

import './core';
import { ComputeJsNextRequestPrev, ComputeJsNextResponsePrev } from './server/base-http/compute-js';
import createServer, { NextServer } from './server/next';

export {
  NextServer, ComputeJsNextResponsePrev, ComputeJsNextRequestPrev
};

export default createServer;
