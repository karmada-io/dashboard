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

import { createContext } from 'react';
import BaseTerminal from './base.ts';
import '@xterm/xterm/css/xterm.css';

export const TerminalContext = createContext<{
  terminal: BaseTerminal | null;
}>({
  terminal: null,
});
export { default as ContainerTerminal } from './container';
export { default as TtydTerminal } from './ttyd';
export type { FlowControl, Preferences, Command } from './ttyd';
export { default as BaseTerminal } from './base';
export type { ITerminalOptions, ITheme } from '@xterm/xterm';
export type {
  AddonType,
  AddonInfo,
  ClientOptions,
  BaseTerminalOptions,
  RendererType,
} from './typing.d.ts';
