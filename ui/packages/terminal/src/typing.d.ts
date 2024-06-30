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
