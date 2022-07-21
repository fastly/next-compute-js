/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

declare function setConsoleFunc(fn: (key: string, ...args: any[]) => void): void;
declare function resetConsoleFunc(): void;

import * as assert from "assert";
import * as sinon from "sinon";

import { toLoggerString } from "../../src/core";

describe('core/console', function() {
  describe('toLoggerString', function() {
    it('handles simple literals', function() {

      // null
      assert.strictEqual(toLoggerString(null), 'null');
      // string
      assert.strictEqual(toLoggerString('foo'), 'foo');
      // number
      assert.strictEqual(toLoggerString(1), '1');
      // boolean
      assert.strictEqual(toLoggerString(true), 'true');
      // bigint
      assert.strictEqual(toLoggerString(BigInt('9007199254740991')), '9007199254740991n');

    });

    it('handles arrays / objects', function() {

      assert.strictEqual(toLoggerString([1, 2, 3, 4, 5]), '[ 1, 2, 3, 4, 5 ]');
      assert.strictEqual(toLoggerString(['foo', 'bar', 'baz']), "[ 'foo', 'bar', 'baz' ]");
      assert.strictEqual(toLoggerString({'foo': 'bar', 'baz': 500}), "{ foo: 'bar', baz: 500 }");

    });

    it('handles formatting strings', function() {

      assert.strictEqual(toLoggerString('foo %s %d', 'bar', 500), "foo bar 500");

    });
  });

  describe('replacement console', function() {
    it('console.log', function() {

      const consoleFunc = sinon.stub();
      setConsoleFunc(consoleFunc);

      console.log('foo %s %d', 'bar', 500);
      assert.ok(consoleFunc.calledOnce);
      assert.strictEqual(consoleFunc.args[0][0], 'log');
      assert.strictEqual(consoleFunc.args[0][1], 'foo bar 500');

      resetConsoleFunc();

    });
  });
});
