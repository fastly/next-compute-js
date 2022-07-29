import { Backends } from "./common";
export type BackendInfo = {
  name: string,
  host: string,
};

function findBackendInfo(backends: Backends, host: string): BackendInfo | null {
  for (const [backendName, backend] of Object.entries(backends)) {
    let isMatch = false;
    if(typeof backend === 'string') {
      if(host === backend) {
        isMatch = true;
      }
    } else {
      if(host === backend.host) {
        isMatch = true;
      }
    }
    if(isMatch) {
      return {
        name: backendName,
        host,
      };
    }
  }
  return null;
}

export function getBackendInfo(backends: Backends | undefined, url: string) {
  if(backends == null) {
    return null;
  }

  const urlObj = new URL(url);

  const hostname = urlObj.hostname;
  const port = urlObj.port;

  let backendName;

  if(port !== '') {
    backendName = findBackendInfo(backends, hostname + ':' + port);
  } else {
    backendName = findBackendInfo(backends, hostname + ':443');
    if(backendName == null) {
      backendName = findBackendInfo(backends, hostname);
    }
  }

  return backendName;
}
