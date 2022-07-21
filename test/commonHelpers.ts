/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as sinon from 'sinon';

export function checkLog(logStub: sinon.SinonStub<any[], void>, message: string | RegExp, count: number = 1): boolean {
  return logStub.args.filter(args => message instanceof RegExp ? message.test(args[0]) : args[0] === message).length === count;
}
