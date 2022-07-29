import { Backends } from "./common";

function findBackendName(backends: Backends, host: string) {
  for (const [backendName, backend] of Object.entries(backends)) {
    if(host === backend.host) {
      return backendName;
    }
  }
  return null;
}

export function getBackendName(backends: Backends | undefined, url: string) {
  if(backends == null) {
    return null;
  }

  const urlObj = new URL(url);

  const hostname = urlObj.hostname;
  const port = urlObj.port;

  let backendName: string | null;

  if(port !== '') {
    backendName = findBackendName(backends, hostname + ':' + port);
  } else {
    backendName = findBackendName(backends, hostname + ':443');
    if(backendName == null) {
      backendName = findBackendName(backends, hostname);
    }
  }

  return backendName;
}
