import { Options } from "next/dist/server/base-server";

export interface ComputeJsAsset {
  contentType: string;
  content: Buffer | string;
  module: any | undefined;
  isStatic: boolean;
}

export type Assets = Record<string, ComputeJsAsset>;

export interface ComputeJsOptions {
  assets: Assets;
}

export interface ComputeJsServerOptions extends Options {
  computeJs: ComputeJsOptions;
}
