/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import type { Buffer } from 'buffer';

import type { Options } from 'next/dist/server/base-server';

export interface ComputeJsAsset {
  contentType: string;
  content: Buffer | string;
  module: any | undefined;
  isStatic: boolean;
}

export type Assets = Record<string, ComputeJsAsset>;
export type Backend = string | { url: string }; // if string is provided, it is assumed to be url
export type Backends = Record<string, Backend>;

export interface ComputeJsOptions {
  assets: Assets;
  backends?: Backends;
}

export interface ComputeJsServerOptions extends Options {
  computeJs: ComputeJsOptions;
}
