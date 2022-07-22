import { ComputeJsNextRequest, ComputeJsNextResponse } from "./base-http/compute-js";
import { Assets } from "./common";
import { getAssetContentType, readAssetFile } from "./require";

export async function serveStatic(
  assets: Assets,
  req: ComputeJsNextRequest,
  res: ComputeJsNextResponse,
  path: string,
  dir: string,
): Promise<void> {

  const decodedPath = decodeURIComponent(path);
  const asset = readAssetFile(assets, decodedPath, dir);

  if(!res.getHeader('Content-Type')) {
    const contentType = getAssetContentType(assets, decodedPath, dir);
    res.setHeader('Content-Type', contentType);
  }

  res.body(asset);
  res.send();

}
