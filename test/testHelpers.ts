/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as sinon from 'sinon';
import { doInit, doShutdown, removeAllActions } from "../src/core";
import { resetRegisteredFetchEventListeners } from "./computeHelpers";

declare global {
  function onBeforeEach(): void;
  function onAfterEach(): void;
}

globalThis.onBeforeEach = () => {
  resetRegisteredFetchEventListeners();
  removeAllActions();
  doInit();
};

globalThis.onAfterEach = () => {
  doShutdown();
  sinon.restore();
};
