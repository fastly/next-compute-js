/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types='@fastly/js-compute' />

import './core';
import { ComputeJsNextRequest, ComputeJsNextResponse } from './server/base-http/compute-js';
import createServer, { NextServer } from './server/next';
import generateETag from './util/etag';

export {
  generateETag,
  NextServer,
  ComputeJsNextResponse,
  ComputeJsNextRequest,
};

export default createServer;
