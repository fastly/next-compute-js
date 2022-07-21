/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { addAction, doAction, onInit } from "./util";

export function addFetchEventAction(priority: number, fn: (event: FetchEvent) => void) {
  addAction('fetchEvent', priority, fn);
}

onInit(() => {
  // The intent is for this event listener (and therefore all functions added
  // by addFetchEventAction) to happen before the event listener provided by the consumer app.
  addEventListener('fetch', event => {
    doAction('fetchEvent', event);
  });
});
