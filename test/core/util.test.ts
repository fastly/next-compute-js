/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';

import { addAction, doAction, isTest, removeAction, removeAllActions } from "../../src/core";

describe('core/util', function() {
  describe('actions', function() {
    beforeEach(function() {
      removeAllActions();
    });

    it('action added with addAction is called when doAction is called', function() {
      const action = sinon.stub();
      addAction('foo', 10, action);
      doAction('foo');
      assert.strictEqual(action.callCount, 1);
    });

    it('action receives args', function() {
      const action = sinon.stub();
      const arg1 = 1;
      const arg2 = {};
      const arg3 = 'bar';
      addAction('foo', 10, action);
      doAction('foo', arg1, arg2, arg3);
      assert.strictEqual(action.callCount, 1);
      assert.strictEqual(action.args[0][0], arg1);
      assert.strictEqual(action.args[0][1], arg2);
      assert.strictEqual(action.args[0][2], arg3);
    });

    it('multiple actions called in order of priority', function() {
      const action10 = sinon.stub();
      const action20 = sinon.stub();
      const action15 = sinon.stub();
      const action5 = sinon.stub();
      const action30 = sinon.stub();

      addAction('foo', 10, action10);
      addAction('foo', 20, action20);
      addAction('foo', 15, action15);
      addAction('foo', 5, action5);
      addAction('foo', 30, action30);
      doAction('foo');

      sinon.assert.callOrder(action5, action10, action15, action20, action30);
    });

    it('multiple actions with same priority called in order of registration', function() {
      const action30 = sinon.stub();
      const action10a = sinon.stub();
      const action20 = sinon.stub();
      const action10b = sinon.stub();
      const action0 = sinon.stub();
      const action10c = sinon.stub();

      addAction('foo', 30, action30);
      addAction('foo', 10, action10a);
      addAction('foo', 20, action20);
      addAction('foo', 10, action10b);
      addAction('foo', 0, action0);
      addAction('foo', 10, action10c);
      doAction('foo');

      sinon.assert.callOrder(action10a, action10b, action10c);
    });

    it('action called as many times as doAction is called', function() {
      const action = sinon.stub();
      addAction('foo', 10, action);
      doAction('foo');
      doAction('foo');
      doAction('foo');
      assert.strictEqual(action.callCount, 3);
    });

    it('action can be called independently by name', function() {
      const actionFoo = sinon.stub();
      const actionBar = sinon.stub();

      addAction('foo', 10, actionFoo);
      addAction('bar', 10, actionBar);
      doAction('foo');

      assert.strictEqual(actionFoo.callCount, 1);
      assert.strictEqual(actionBar.callCount, 0);
    });

    it('remove actions by name, priority, and action', function() {
      const action1 = sinon.stub();
      const action2 = sinon.stub();
      const action3 = sinon.stub();

      addAction('foo', 1, action1);
      addAction('foo', 2, action2);
      addAction('foo', 3, action3);

      removeAction('foo', 2, action2);
      doAction('foo');

      assert.strictEqual(action1.callCount, 1);
      assert.strictEqual(action2.callCount, 0);
      assert.strictEqual(action3.callCount, 1);
    });

    it('remove actions by name and priority', function() {
      const action1 = sinon.stub();
      const action2a = sinon.stub();
      const action2b = sinon.stub();
      const action3 = sinon.stub();

      addAction('foo', 1, action1);
      addAction('foo', 2, action2a);
      addAction('foo', 2, action2b);
      addAction('foo', 3, action3);

      removeAction('foo', 2);
      doAction('foo');

      assert.strictEqual(action1.callCount, 1);
      assert.strictEqual(action2a.callCount, 0);
      assert.strictEqual(action2b.callCount, 0);
      assert.strictEqual(action3.callCount, 1);
    });

    it('remove actions by name and fn', function() {
      const actionA = sinon.stub();
      const actionB = sinon.stub();
      const actionC = sinon.stub();

      addAction('foo', 1, actionA);
      addAction('foo', 2, actionB);
      addAction('foo', 2, actionA);
      addAction('foo', 3, actionC);

      removeAction('foo', undefined, actionA);
      doAction('foo');

      assert.strictEqual(actionA.callCount, 0);
      assert.strictEqual(actionB.callCount, 1);
      assert.strictEqual(actionC.callCount, 1);
    });

    it('remove actions by name and fn', function() {
      const actionA = sinon.stub();
      const actionB = sinon.stub();
      const actionC = sinon.stub();

      addAction('foo', 1, actionA);
      addAction('foo', 2, actionB);
      addAction('foo', 3, actionC);

      removeAction('foo');
      doAction('foo');

      assert.strictEqual(actionA.callCount, 0);
      assert.strictEqual(actionB.callCount, 0);
      assert.strictEqual(actionC.callCount, 0);
    });

    it('attempt to remove action by unknown name should cause no problems', function(done) {

      addAction('foo', 1, () => {});
      removeAction('bar', 1);
      done();

    });

    it('remove all actions', function() {
      const actionFoo = sinon.stub();
      const actionBar = sinon.stub();

      addAction('foo', 10, actionFoo);
      addAction('bar', 10, actionBar);

      removeAllActions();

      doAction('foo');
      doAction('bar');

      assert.strictEqual(actionFoo.callCount, 0);
      assert.strictEqual(actionBar.callCount, 0);
    });
  });

  describe('isTest', function() {
    it('should return true, since we are in a test', function() {
      assert.ok( isTest() );
    });
  });
});
