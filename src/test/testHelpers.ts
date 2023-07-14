/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as sinon from 'sinon';

declare global {
  function onBeforeEach(): void;
  function onAfterEach(): void;
}

globalThis.onBeforeEach = () => {
};

globalThis.onAfterEach = () => {
  sinon.restore();
};
