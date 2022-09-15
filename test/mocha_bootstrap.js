/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

let _replacementFetchFunc = null;
globalThis.fetch = (requestInfo, requestInit) => {
  if(_replacementFetchFunc != null) {
    return _replacementFetchFunc(requestInfo, requestInit);
  } else {
    // no fetch in raw node
    return Promise.resolve({status:500});
  }
}

globalThis.setFetchFunc = (fn) => {
  _replacementFetchFunc = fn;
}

globalThis.resetFetchFunc = () => {
  _replacementFetchFunc = null;
}

// Restores the default sandbox after every test
exports.mochaHooks = {
  beforeEach() {
    resetFetchFunc();
    onBeforeEach();
  },
  afterEach() {
    onAfterEach();
  },
};
