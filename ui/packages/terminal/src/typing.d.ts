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

import { ITerminalAddon, type ITerminalOptions, Terminal } from '@xterm/xterm';

export interface innerTerminal extends Terminal {
  fit(): void;
}

// AddonType should sync with `cat package.json|grep @xterm/addon-`
export type AddonType =
  | 'webgl'
  | 'canvas'
  | 'fit'
  | 'clipboard'
  | 'search'
  | 'webLinks'
  | 'unicode11'
  | 'ligatures'
  | 'overlay'
  | 'zmodem';

export interface AddonInfo {
  name: string;
  ctor: ITerminalAddon;
}

export interface ClientOptions {
  rendererType: RendererType;
  disableLeaveAlert: boolean;
  disableResizeOverlay: boolean;
  enableZmodem: boolean;
  enableSixel: boolean;
  enableTrzsz: boolean;
  trzszDragInitTimeout: number;
  isWindows: boolean;
  unicodeVersion: string;
}

export interface BaseTerminalOptions {
  clientOptions: ClientOptions;
  xtermOptions: ITerminalOptions;
}

export type RendererType = 'dom' | 'canvas' | 'webgl';
