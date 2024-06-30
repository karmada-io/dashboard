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
