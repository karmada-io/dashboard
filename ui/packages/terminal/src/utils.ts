/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import type { IDisposable } from '@xterm/xterm';
import debug from 'debug';

export function addEventListener(
  target: EventTarget,
  type: string,
  listener: EventListener,
): IDisposable {
  target.addEventListener(type, listener);
  return toDisposable(() => target.removeEventListener(type, listener));
}

export function toDisposable(f: () => void): IDisposable {
  return { dispose: f };
}

const debuggerStore: Record<string, debug.Debugger> = {};

export function getDebugger(name: string) {
  if (name in debuggerStore) {
    return debuggerStore[name];
  }
  debuggerStore[name] = debug(name);
  return debuggerStore[name];
}
