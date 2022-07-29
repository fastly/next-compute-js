import { Options } from "next/dist/server/base-server";

export interface ComputeJsAsset {
  contentType: string;
  content: Buffer | string;
  module: any | undefined;
  isStatic: boolean;
}

export type Assets = Record<string, ComputeJsAsset>;
export type Backend = {
  host: string
};
export type Backends = Record<string, Backend>;

export interface ComputeJsOptions {
  assets: Assets;
  backends?: Backends;
}

export interface ComputeJsServerOptions extends Options {
  computeJs: ComputeJsOptions;
}
