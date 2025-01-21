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

import type { ITerminalOptions } from '@xterm/xterm';
import { addEventListener, getDebugger } from './utils';
import BaseTerminal from './base.ts';
import { BaseTerminalOptions, ClientOptions } from './typing';
import OverlayAddon from '@karmada/xterm-addon-overlay';
import ZmodemAddon from '@karmada/xterm-addon-zmodem';

export type Preferences = ITerminalOptions & ClientOptions;

const log = getDebugger('TtydTerminal');

interface TtydTerminalOptions {
  wsUrl: string;
  tokenUrl: string;
  flowControl: FlowControl;
}

export interface FlowControl {
  limit: number;
  highWater: number;
  lowWater: number;
}

export enum Command {
  // server side
  OUTPUT = '0',
  SET_WINDOW_TITLE = '1',
  SET_PREFERENCES = '2',

  /* eslint-disable @typescript-eslint/no-duplicate-enum-values */
  // client side
  INPUT = '0',
  RESIZE_TERMINAL = '1',
  PAUSE = '2',
  RESUME = '3',
  /* eslint-enable @typescript-eslint/no-duplicate-enum-values */
}

class TtydTerminal extends BaseTerminal {
  private ttydTerminalOptions: TtydTerminalOptions;
  private socket!: WebSocket;
  private opened = false;
  private reconnect = true;
  private doReconnect = true;
  private token: string = '';
  private textEncoder = new TextEncoder();
  private textDecoder = new TextDecoder();

  private written = 0;
  private pending = 0;

  private title?: string;
  private titleFixed?: string;
  private resizeOverlay = true;
  private sendCb = () => {};

  constructor(options: BaseTerminalOptions, ttydOptions: TtydTerminalOptions) {
    super(options);
    this.ttydTerminalOptions = ttydOptions;
    this.addons = {
      ...this.addons,
      overlay: {
        name: 'overlay',
        ctor: new OverlayAddon(),
      },
    };
  }

  private writeFunc = (data: ArrayBuffer) => {
    return this.writeData(new Uint8Array(data));
  };

  public writeData = (data: string | Uint8Array) => {
    const { terminal, textEncoder } = this;
    if (!terminal) return;
    const { limit, highWater, lowWater } = this.ttydTerminalOptions.flowControl;

    this.written += data.length;
    if (this.written > limit) {
      terminal.write(data, () => {
        this.pending = Math.max(this.pending - 1, 0);
        if (this.pending < lowWater) {
          this.socket.send(textEncoder.encode(Command.RESUME));
        }
      });
      this.pending++;
      this.written = 0;
      if (this.pending > highWater) {
        this.socket.send(textEncoder.encode(Command.PAUSE));
      }
    } else {
      terminal.write(data);
    }
  };

  public sendData = (data: string | Uint8Array) => {
    const { socket, textEncoder } = this;
    if (socket.readyState !== WebSocket.OPEN) return;

    if (typeof data === 'string') {
      const payload = new Uint8Array(data.length * 3 + 1);
      payload[0] = Command.INPUT.charCodeAt(0);
      const stats = textEncoder.encodeInto(data, payload.subarray(1));
      socket.send(payload.subarray(0, (stats.written as number) + 1));
    } else {
      const payload = new Uint8Array(data.length + 1);
      payload[0] = Command.INPUT.charCodeAt(0);
      payload.set(data, 1);
      socket.send(payload);
    }
  };

  public refreshToken = async () => {
    try {
      const resp = await fetch(this.ttydTerminalOptions.tokenUrl);
      if (resp.ok) {
        const json = await resp.json();
        this.token = json.token;
      }
    } catch (e) {
      log(`[ttyd] fetch ${this.ttydTerminalOptions.tokenUrl}: `, e);
    }
  };

  private parseOptsFromUrlQuery = (query: string): Preferences => {
    const { terminal } = this;
    const clientOptions = this.baseTerminalOptions
      .clientOptions as unknown as Record<string, string>;
    const prefs = {} as Record<string, boolean | number | string>;
    const queryObj = Array.from(
      new URLSearchParams(query) as unknown as Iterable<[string, string]>,
    );

    for (const [k, queryVal] of queryObj) {
      let v = clientOptions[k];
      if (v === undefined) v = (terminal?.options as Record<string, string>)[k];
      switch (typeof v) {
        case 'boolean':
          prefs[k] = queryVal === 'true' || queryVal === '1';
          break;
        case 'number':
        case 'bigint':
          prefs[k] = Number.parseInt(queryVal, 10);
          break;
        case 'string':
          prefs[k] = queryVal;
          break;
        case 'object':
          prefs[k] = JSON.parse(queryVal);
          break;
        default:
          console.warn(
            `[ttyd] maybe unknown option: ${k}=${queryVal}, treating as string`,
          );
          prefs[k] = queryVal;
          break;
      }
    }

    return prefs as unknown as Preferences;
  };

  private initTtydListeners = () => {
    const { terminal } = this;
    this.register(
      terminal.onTitleChange((data) => {
        if (data && data !== '' && !this.titleFixed) {
          document.title = data + ' | ' + this.title;
        }
      }),
      terminal.onData((data) => this.sendData(data)),
      terminal.onResize(({ cols, rows }) => {
        const msg = JSON.stringify({ columns: cols, rows: rows });
        this.socket.send(
          this.textEncoder.encode(Command.RESIZE_TERMINAL + msg),
        );
        if (this.resizeOverlay) {
          this.getAddon<OverlayAddon>('overlay')?.showOverlay(
            `${cols}x${rows}`,
            300,
          );
        }
      }),
      terminal.onSelectionChange(() => {
        if (terminal.getSelection() === '') return;
        try {
          document.execCommand('copy');
        } catch (e) {
          return;
        }
        this.getAddon<OverlayAddon>('overlay')?.showOverlay('\u2702', 200);
      }),
      addEventListener(window, 'beforeunload', this.onWindowUnload),
    );
  };

  public connect = () => {
    this.socket = new WebSocket(this.ttydTerminalOptions.wsUrl, ['tty']);
    const { socket, register } = this;
    socket.binaryType = 'arraybuffer';
    register(
      addEventListener(socket, 'open', this.onSocketOpen),
      addEventListener(socket, 'message', this.onSocketData as EventListener),
      addEventListener(socket, 'close', this.onSocketClose as EventListener),
      addEventListener(socket, 'error', () => (this.doReconnect = false)),
    );
  };

  private onSocketOpen = () => {
    const { terminal, socket, textEncoder } = this;
    if (socket.readyState != 1) {
      return;
    }
    log('[ttyd] websocket connection opened', socket.readyState);

    const msg = JSON.stringify({
      AuthToken: this.token,
      columns: terminal.cols,
      rows: terminal.rows,
    });
    socket.send(textEncoder.encode(msg));

    if (this.opened && terminal) {
      terminal.reset();
      terminal.options.disableStdin = false;
    } else {
      this.opened = true;
    }

    this.doReconnect = this.reconnect;
    this.initTtydListeners();
    terminal.focus();
  };
  private onSocketClose = (event: CloseEvent) => {
    log(`[ttyd] websocket connection closed with code: ${event.code}`);
    const { refreshToken, connect, doReconnect, terminal } = this;
    this.dispose();

    // 1000: CLOSE_NORMAL
    if (event.code !== 1000 && doReconnect) {
      refreshToken().then(connect);
    } else {
      const keyDispose = terminal.onKey((e) => {
        const event = e.domEvent;
        if (event.key === 'Enter') {
          keyDispose.dispose();
          refreshToken().then(connect);
        }
      });
    }
  };
  private onSocketData = (event: MessageEvent) => {
    const { textDecoder } = this;
    const rawData = event.data as ArrayBuffer;
    const cmd = String.fromCharCode(new Uint8Array(rawData)[0]);
    const data = rawData.slice(1);

    switch (cmd) {
      case Command.OUTPUT:
        this.writeFunc(data);
        break;
      case Command.SET_WINDOW_TITLE:
        this.title = textDecoder.decode(data);
        document.title = this.title;
        break;
      case Command.SET_PREFERENCES:
        this.applyPreferences({
          ...this.baseTerminalOptions.clientOptions,
          ...JSON.parse(textDecoder.decode(data)),
          ...this.parseOptsFromUrlQuery(window.location.search),
        } as Preferences);
        break;
      default:
        log(`[ttyd] unknown command: ${cmd}`);
        break;
    }
  };
  private onWindowUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    if (this.socket.readyState === WebSocket.OPEN) {
      return 'Close terminal? this will also terminate the command.';
    }
    return undefined;
  };

  public applyPreferences = (prefs: Preferences) => {
    log('preferences', prefs);
    const { terminal } = this;
    if (prefs.enableZmodem || prefs.enableTrzsz) {
      const zmodemAddon = new ZmodemAddon({
        zmodem: prefs.enableZmodem,
        trzsz: prefs.enableTrzsz,
        windows: prefs.isWindows,
        trzszDragInitTimeout: prefs.trzszDragInitTimeout,
        onSend: this.sendCb,
        sender: this.sendData,
        writer: this.writeData,
      });
      this.writeFunc = (data) => {
        return this.getAddon<ZmodemAddon>('zmodem')?.consume(data);
      };
      this.setAddon('zmodem', zmodemAddon);
    }
    const opts = {
      ...(terminal?.options as Record<string, unknown>),
    };
    delete opts['cols'];
    delete opts['rows'];
    for (const [key, value] of Object.entries(prefs)) {
      switch (key) {
        case 'rendererType':
          this.setRendererType(value);
          break;
        // case 'disableLeaveAlert':
        //     if (value) {
        //         window.removeEventListener('beforeunload', this.onWindowUnload);
        //         log('[ttyd] Leave site alert disabled');
        //     }
        //     break;
        // case 'disableResizeOverlay':
        //     if (value) {
        //         log('[ttyd] Resize overlay disabled');
        //         this.resizeOverlay = false;
        //     }
        //     break;
        // case 'disableReconnect':
        //   if (value) {
        //     log('[ttyd] Reconnect disabled');
        //     this.reconnect = false;
        //     this.doReconnect = false;
        //   }
        //   break;
        case 'enableZmodem':
          if (value) log('[ttyd] Zmodem enabled');
          break;
        case 'enableTrzsz':
          if (value) log('[ttyd] trzsz enabled');
          break;
        case 'trzszDragInitTimeout':
          if (value) log(`[ttyd] trzsz drag init timeout: ${value}`);
          break;
        // case 'enableSixel':
        //     if (value) {
        //         terminal?.loadAddon(register(new ImageAddon()));
        //         log('[ttyd] Sixel enabled');
        //     }
        //     break;
        // case 'titleFixed':
        //   if (!value || value === '') return;
        //   log(`[ttyd] setting fixed title: ${value}`);
        //   this.titleFixed = value;
        //   document.title = value;
        //   break;
        case 'isWindows':
          if (value) log('[ttyd] is windows');
          break;
        // case 'unicodeVersion':
        //     switch (value) {
        //         case 6:
        //         case '6':
        //             log('[ttyd] setting Unicode version: 6');
        //             break;
        //         case 11:
        //         case '11':
        //         default:
        //             log('[ttyd] setting Unicode version: 11');
        //             terminal?.loadAddon(new Unicode11Addon());
        //             terminal && (terminal.unicode.activeVersion = '11');
        //             break;
        //     }
        //     break;
        default:
          log(`[ttyd] option: ${key}=${JSON.stringify(value)}`);
          if (opts[key] instanceof Object) {
            opts[key] = Object.assign({}, opts[key], value);
          } else {
            opts[key] = value;
          }
          terminal && (terminal.options = opts);

          if (key.indexOf('font') === 0) {
            terminal.fit();
          }
          break;
      }
    }
  };
}

export default TtydTerminal;
