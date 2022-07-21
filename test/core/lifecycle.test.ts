/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as assert from "assert";
import * as sinon from 'sinon';

import {
  buildFakeFetchEvent,
  runRegisteredFetchEventListeners,
} from "../computeHelpers";
import { addFetchEventAction } from "../../src/core";

describe('core/lifecycle', function() {

  describe('addFetchEventAction', function () {
    it('passed-in action gets called', function() {

      const action = sinon.stub();
      addFetchEventAction(10, action);

      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.strictEqual(action.callCount, 1);
      assert.strictEqual(action.args[0][0], fetchEvent);

    });
  });

});
