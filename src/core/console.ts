/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import util from 'node-inspect-extracted';

// Patch console so it's a little bit more useful
const origConsole = globalThis.console;

const logMethods = [ 'log', 'trace', 'info', 'warn', 'error' ];
const betterConsole: {[key: typeof logMethods[number]]: (...args: any[]) => void} = {};
for(const key of logMethods) {
  betterConsole[key] = (...args: any[]) => {
    const str = toLoggerString(...args);
    (origConsole as any)[key](str);
  };
}

globalThis.console = betterConsole as any;

export function toLoggerString(...args: any[]): string {
  return util.format(...args);
}
