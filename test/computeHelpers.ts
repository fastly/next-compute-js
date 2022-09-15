/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types="@fastly/js-compute" />

import * as sinon from 'sinon';
import { addFetchEventAction, onInit } from "../src/core";

class CacheOverrideMock {
  mode: CacheOverrideMode;
  init: CacheOverrideInit | undefined;
  constructor(mode: CacheOverrideMode, init?: CacheOverrideInit) {
    this.mode = mode;
    this.init = init;
  }
}
globalThis.CacheOverride = CacheOverrideMock;

export class MockedHeaders implements Headers {
  get(name: string): string | null {
    return null;
  }
  has(name: string): boolean {
    return false;
  }
  delete(name: string): void {}

  set!: (name: string, value: string) => void;
  append!: (name: string, value: string) => void;
  entries!: () => IterableIterator<[string, string]>;
  forEach!: (callback: (value: string, name: string, parent: Headers) => void) => void;
  keys!: () => IterableIterator<string>;
  values!: () => IterableIterator<[string]>;
  [Symbol.iterator]!: () => Iterator<[string, string]>;
}

export class MockedClientInfo implements ClientInfo {
  readonly address: string = "10.0.0.1";
  readonly geo!: Geolocation;
}

export class MockedRequest implements Request {
  url = 'https://www.example.com/';
  headers = new MockedHeaders();

  backend!: string;
  readonly body!: ReadableStream<any>;
  bodyUsed!: boolean;
  method!: string;

  arrayBuffer!: () => Promise<ArrayBuffer>;
  json!: () => Promise<any>;
  setCacheOverride!: (override: CacheOverride) => void;
  text!: () => Promise<string>;
}

export class MockedFetchEvent implements FetchEvent {
  constructor() {
    this.client = new MockedClientInfo();
    this.request = new MockedRequest();
  }

  readonly client: ClientInfo;
  readonly request: Request;

  respondWith = sinon.stub<[Response | Promise<Response>], void>()
    .callsFake(() => {
      (this as any)._stopPropagation = true
    });
  waitUntil = sinon.stub<[Promise<any>], void>();
}

export function buildFakeFetchEvent() {
  return new MockedFetchEvent();
}

export class MockedResponse implements Response {
  constructor(body?: BodyInit, init?: ResponseInit) {
    this.status = init?.status ?? 200;
    if(typeof body === 'string') {
      this._body = body;
    }
  }

  status: number;
  _body?: string;
  text(): Promise<string> {
    return Promise.resolve(this._body ?? '');
  };

  statusText!: string;
  headers!: Headers;
  ok!: boolean;
  redirected!: boolean;
  url!: string;
  body!: ReadableStream;
  bodyUsed!: boolean;
  arrayBuffer!: () => Promise<ArrayBuffer>;
  json!: () => Promise<any>;
}

export class LoggerMock implements Logger {
  public endpoint: string;
  public called: boolean;
  public loggedContent?: string;
  constructor(endpoint: string) {
    this.called = false;
    this.endpoint = endpoint;
  }
  log(message: any): void {
    this.called = true;
    this.loggedContent = String(message);
  }
  reset() {
    this.called = false;
    this.loggedContent = undefined;
  }
}

class FastlyMock implements Fastly {
  _loggers: {[endpoint: string]: Logger} = {};
  _requireFetchEvent: boolean = true;

  getLogger = sinon.stub().callsFake((endpoint: string) => {
    if(this._requireFetchEvent) {
      const fetchEvent = getRequestFetchEvent();
      if(fetchEvent == null) {
        throw new Error('no fetch event');
      }
    }
    if(endpoint in this._loggers) {
      return this._loggers[endpoint];
    }
    const logger = new LoggerMock(endpoint);
    this._loggers[endpoint] = logger;
    return logger;
  });

  baseURL!: URL | null;
  defaultBackend!: string;
  env!: Env;
  enableDebugLogging!: (enabled: boolean) => void;
  getGeolocationForIpAddress!: (address: string) => Geolocation;
  includeBytes!: (path: String) => Uint8Array;

  clearLoggers() {
    this._loggers = {};
  }
  mockLoggersRequireFetchEvent(require: boolean = true) {
    this._requireFetchEvent = require;
  }
}

export const fastlyMock = new FastlyMock();
globalThis.fastly = fastlyMock;

type FetchEventListener = (event: FetchEvent) => void;

let _fetchEventErrors: any[] = [];
let _listeners: FetchEventListener[] = [];
function registerFetchEventListener(listener: FetchEventListener): void {
  _listeners.push(listener);
}
export function getRegisteredFetchEventListeners() {
  return _listeners;
}
export function getRegisteredFetchEventErrors() {
  return _fetchEventErrors;
}
export function runRegisteredFetchEventListeners(event: FetchEvent) {
  for(const listener of _listeners) {
    try {
      listener(event);
    } catch(ex) {
      _fetchEventErrors.push(ex);
    }
    if((event as any)._stopPropagation) {
      break;
    }
  }
}
export function resetRegisteredFetchEventListeners() {
  _listeners = [];
  _fetchEventErrors = [];
}

function addEventListenerMock(type: 'fetch', listener: FetchEventListener): void {
  registerFetchEventListener(listener);
}
globalThis.addEventListener = addEventListenerMock;

let _requestFetchEvent: FetchEvent | null = null;
export function getRequestFetchEvent() {
  return _requestFetchEvent;
}

onInit(() => {
  _requestFetchEvent = null;
  fastlyMock.clearLoggers();
  fastlyMock.mockLoggersRequireFetchEvent();
  addFetchEventAction(-1, (event) => {
    _requestFetchEvent = event;
  });
});
