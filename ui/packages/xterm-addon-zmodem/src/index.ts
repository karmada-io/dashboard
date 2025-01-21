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

import { saveAs } from 'file-saver';
import { IDisposable, ITerminalAddon, Terminal } from '@xterm/xterm';
// we've made some patch for the zmodem.js package, but pnpm doesn't support
// sub package patchedDependencies field :https://github.com/pnpm/pnpm/issues/6048
// so we hoist the patchedDependencies to the root dir of pnpm monorepo: `ui` dir
import * as Zmodem from 'zmodem.js/src/zmodem_browser';
import { TrzszFilter } from 'trzsz';

export interface ZmodemOptions {
  zmodem: boolean;
  trzsz: boolean;
  windows: boolean;
  trzszDragInitTimeout: number;
  onSend: () => void;
  sender: (data: string | Uint8Array) => void;
  writer: (data: string | Uint8Array) => void;
}

class ZmodemAddon implements ITerminalAddon {
  private disposables: IDisposable[] = [];
  private terminal: Terminal | null = null;
  private sentry!: Zmodem.Sentry;
  private session: Zmodem.Session;
  private denier: () => void = () => {};
  private trzszFilter: TrzszFilter | null = null;

  constructor(private options: ZmodemOptions) {}

  activate(terminal: Terminal) {
    this.terminal = terminal;
    if (this.options.zmodem) this.zmodemInit();
    if (this.options.trzsz) this.trzszInit();
  }

  dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
  }

  consume(data: ArrayBuffer) {
    try {
      if (this.options.trzsz) {
        this.trzszFilter?.processServerOutput(data);
      } else {
        this.sentry.consume(data);
      }
    } catch (e) {
      console.error('[ttyd] zmodem consume: ', e);
      this.reset();
    }
  }

  private reset() {
    if (!this.terminal) return;
    this.terminal.options.disableStdin = false;
    this.terminal.focus();
  }

  private addDisposableListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
  ) {
    target.addEventListener(type, listener);
    this.disposables.push({
      dispose: () => target.removeEventListener(type, listener),
    });
  }

  private trzszInit() {
    const { terminal } = this;
    if (!terminal) return;
    const { sender, writer, zmodem } = this.options;
    this.trzszFilter = new TrzszFilter({
      writeToTerminal: (data) => {
        if (!this.trzszFilter) return;
        if (!this.trzszFilter.isTransferringFiles() && zmodem) {
          this.sentry.consume(data);
        } else {
          writer(
            typeof data === 'string'
              ? data
              : new Uint8Array(data as ArrayBuffer),
          );
        }
      },
      sendToServer: (data) => sender(data),
      terminalColumns: terminal.cols,
      isWindowsShell: this.options.windows,
      dragInitTimeout: this.options.trzszDragInitTimeout,
    });
    const element = terminal.element as EventTarget;
    this.addDisposableListener(element, 'dragover', (event) =>
      event.preventDefault(),
    );
    this.addDisposableListener(element, 'drop', (event) => {
      event.preventDefault();
      if (!this.trzszFilter) return;
      this.trzszFilter
        .uploadFiles(
          (event as DragEvent).dataTransfer?.items as DataTransferItemList,
        )
        .then(() => console.log('[ttyd] upload success'))
        .catch((err) => console.log('[ttyd] upload failed: ' + err));
    });
    this.disposables.push(
      terminal.onResize((size) =>
        this.trzszFilter?.setTerminalColumns(size.cols),
      ),
    );
  }

  private zmodemInit() {
    const { sender, writer } = this.options;
    const { terminal, reset, zmodemDetect } = this;
    if (!terminal) return;
    this.session = null;
    this.sentry = new Zmodem.Sentry({
      to_terminal: (octets: Iterable<number>) => writer(new Uint8Array(octets)),
      sender: (octets: Iterable<number>) => sender(new Uint8Array(octets)),
      on_retract: () => reset(),
      on_detect: (detection: Zmodem.Detection) => zmodemDetect(detection),
    });
    this.disposables.push(
      terminal.onKey((e) => {
        const event = e.domEvent;
        if (event.ctrlKey && event.key === 'c') {
          if (this.denier) this.denier();
        }
      }),
    );
  }

  private zmodemDetect(detection: Zmodem.Detection): void {
    if (!this.terminal) return;
    const { terminal, receiveFile } = this;
    terminal.options.disableStdin = true;

    this.denier = () => detection.deny();
    this.session = detection.confirm();
    this.session.on('session_end', () => this.reset());

    if (this.session.type === 'send') {
      this.options.onSend();
    } else {
      receiveFile();
    }
  }

  public sendFile(files: FileList) {
    const { session, writeProgress } = this;
    Zmodem.Browser.send_files(session, files, {
      on_progress: (_: any, offer: Zmodem.Offer) => writeProgress(offer),
    })
      .then(() => session.close())
      .catch(() => this.reset());
  }

  private receiveFile() {
    const { session, writeProgress } = this;

    session.on('offer', (offer: Zmodem.Offer) => {
      offer.on('input', () => writeProgress(offer));
      offer
        .accept()
        .then((payloads: any) => {
          const blob = new Blob(payloads, { type: 'application/octet-stream' });
          saveAs(blob, offer.get_details().name);
        })
        .catch(() => this.reset());
    });

    session.start();
  }

  private writeProgress(offer: Zmodem.Offer) {
    const { bytesHuman } = this;
    const file = offer.get_details();
    const name = file.name;
    const size = file.size;
    const offset = offer.get_offset();
    const percent = ((100 * offset) / size).toFixed(2);

    this.options.writer(
      `${name} ${percent}% ${bytesHuman(offset, 2)}/${bytesHuman(size, 2)}\r`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bytesHuman(bytes: any, precision: number): string {
    if (!/^([-+])?|(\.\d+)(\d+(\.\d+)?|(\d+\.)|Infinity)$/.test(bytes)) {
      return '-';
    }
    if (bytes === 0) return '0';
    if (typeof precision === 'undefined') precision = 1;
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const num = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = (bytes / Math.pow(1024, Math.floor(num))).toFixed(precision);
    return `${value} ${units[num]}`;
  }
}

export default ZmodemAddon;
