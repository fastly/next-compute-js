/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

type Action = (...args: any[]) => void;
interface ActionDef {
  priority: number;
  fn: Action;
}
class ActionsManager {
  _actionsMap = new Map<string, ActionDef[]>();
  _dirtyKeys = new Set<string>();

  addAction(name: string, priority: number, fn: Action) {

    let actions = this._actionsMap.get(name);
    if(actions == null) {
      actions = [];
      this._actionsMap.set(name, actions);
    }
    actions.push({priority, fn});
    this._dirtyKeys.add(name);

  }

  sort() {
    for (const key of [...this._dirtyKeys]) {
      const actions = this._actionsMap.get(key);
      this._dirtyKeys.delete(key);
      if (actions == null) {
        continue;
      }
      actions.sort((a, b) => {
        return a.priority - b.priority;
      });
    }
  }

  doAction(name: string, ...args: any[]) {
    this.sort();

    const actions = this._actionsMap.get(name);
    if(actions == null) {
      return;
    }

    for (const actionDef of actions) {
      actionDef.fn(...args);
    }
  }

  removeAction(name: string, priority?: number, fn?: Action): void {
    if(priority == null && fn == null) {
      this._actionsMap.delete(name);
      return;
    }

    const actions = this._actionsMap.get(name);
    if(actions == null) {
      return;
    }

    const updatedActions =
      actions.filter(def =>
        !(
          (priority === undefined || def.priority === priority) &&
          (fn === undefined || def.fn === fn)
        )
      );

    this._actionsMap.set(name, updatedActions);
  }

  removeAllActions() {
    this._actionsMap.clear();
  }
}

const actionsManager = new ActionsManager();

export function addAction(name: string, priority: number, fn: Action) {
  actionsManager.addAction(name, priority, fn);
}

export function doAction(name: string, ...args: any[]) {
  actionsManager.doAction(name, ...args);
}

export function removeAction(name: string, priority?: number, fn?: Action): void {
  actionsManager.removeAction(name, priority, fn);
}

export function removeAllActions() {
  actionsManager.removeAllActions();
}

export function isTest() {
  // assume test suite is mocha, and check for it and describe
  return typeof globalThis.it === 'function' && typeof globalThis.describe === 'function';
}

type LifecycleFunction = () => void;
const _initFunctions: LifecycleFunction[] = [];
export function onInit(fn: LifecycleFunction) {
  /* istanbul ignore else */
  if(isTest()) {
    _initFunctions.push(fn);
  } else {
    fn();
  }
}

export function doInit() {
  for(const fn of _initFunctions) {
    fn();
  }
}

const _shutdownFunctions: LifecycleFunction[] = [];
export function onShutdown(fn: LifecycleFunction) {
  /* istanbul ignore else */
  if(isTest()) {
    _shutdownFunctions.push(fn);
  } else {
    // we don't need to run shutdown functions in C@E
  }
}

export function doShutdown() {
  for(const fn of _shutdownFunctions) {
    fn();
  }
}
