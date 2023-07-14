/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

export const mochaGlobalSetup = () => {
};

// Restores the default sandbox after every test
export const mochaHooks = {
  beforeEach() {
    onBeforeEach();
  },
  afterEach() {
    onAfterEach();
  },
};
