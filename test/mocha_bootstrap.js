/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

const origConsole = globalThis.console;

let _replacementConsoleFunc = null;

const logMethods = [ 'log', 'debug', 'info', 'warn', 'error' ];
const replacementConsole = {};
for(const item of logMethods) {
  let key, func;
  if(typeof item === 'string') {
    key = func = item;
  } else {
    [key, func] = item;
  }
  replacementConsole[key] = (...args) => {
    if(_replacementConsoleFunc != null) {
      _replacementConsoleFunc(key, ...args);
    } else {
      origConsole[func](...args);
    }
  }
}
globalThis.console = replacementConsole;

globalThis.setConsoleFunc = (fn) => {
  _replacementConsoleFunc = fn;
}

globalThis.resetConsoleFunc = () => {
  _replacementConsoleFunc = null;
}

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
    resetConsoleFunc();
    resetFetchFunc();
    onBeforeEach();
  },
  afterEach() {
    onAfterEach();
  },
};
