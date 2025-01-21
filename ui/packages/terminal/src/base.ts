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

import { IDisposable, ITerminalAddon, Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { CanvasAddon } from '@xterm/addon-canvas';
import { WebglAddon } from '@xterm/addon-webgl';
import isEmpty from 'lodash.isempty';
import { addEventListener, getDebugger } from './utils.ts';
import {
  AddonInfo,
  AddonType,
  innerTerminal,
  RendererType,
  BaseTerminalOptions,
} from './typing';

const log = getDebugger('BaseTerminal');

class BaseTerminal implements IDisposable {
  // terminal is a xterm instance, use inherited type for add method on xterm instance
  protected terminal!: innerTerminal;
  // use `isXtermOpened` flag avoid create xterm instance multiple times
  protected isXtermOpened: boolean = false;
  /*
   * baseTerminalOptions consists of clientOptions and xtermOptions
   * clientOptions: custom options for terminal
   * xtermOptions: options for xterm
   */
  protected baseTerminalOptions: BaseTerminalOptions;
  // disposables used for store clean function for resources
  private disposables: IDisposable[] = [];
  // addons store the addons of xterm
  protected addons = {} as Record<AddonType, AddonInfo>;

  constructor(options: BaseTerminalOptions) {
    this.baseTerminalOptions = options;
    this.addons = {
      ...this.addons,
      fit: {
        name: 'fit',
        ctor: new FitAddon(),
      },
      webLinks: {
        name: 'webLinks',
        ctor: new WebLinksAddon(),
      },
      search: {
        name: 'search',
        ctor: new SearchAddon(),
      },
    };
  }

  public register = <T extends IDisposable>(...disposables: T[]): T[] => {
    for (const disposable of disposables) {
      this.disposables.push(disposable);
    }
    return disposables;
  };

  private initListeners() {
    this.register(
      addEventListener(window, 'resize', () =>
        this.mustGetAddon<FitAddon>('fit').fit(),
      ),
    );
  }

  public dispose = () => {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
  };

  public setRendererType(value: RendererType) {
    log('setRendererType', value);
    switch (value) {
      case 'canvas':
        this.deleteAddon('webgl');
        this.setAddon('canvas', new CanvasAddon());
        log('[ttyd] canvas renderer loaded');
        break;
      case 'webgl':
        this.deleteAddon('canvas');
        this.setAddon('webgl', new WebglAddon());
        log('[ttyd] WebGL renderer loaded');
        break;
      case 'dom':
        this.deleteAddon('webgl');
        this.deleteAddon('canvas');
        log('[ttyd] dom renderer loaded');
        break;
      default:
        break;
    }
  }

  /**
   * return the addon accoring to addon name, but the function doesn't ensure
   * you can get the addon as expected, if the addon exist, it will return the addon,
   * otherwise you'll get null
   * @param name name of the addon
   * */
  public getAddon = <T extends ITerminalAddon>(name: AddonType): T | null => {
    if (name in this.addons) {
      return this.addons[name].ctor as unknown as T;
    }
    return null;
  };

  /**
   * mustGetAddon will ensure you get the addon as expected, if the addon not exist, it
   * will throw an expection.
   * @param name name of the addon
   */
  public mustGetAddon = <T extends ITerminalAddon>(name: AddonType): T => {
    if (name in this.addons) {
      return this.addons[name].ctor as unknown as T;
    }
    throw Error(`Cannot find addon[${name}]`);
  };

  /**
   * setAddon will store the addon into addons, and make the terminal load addon.
   * If you setAddon multiple times, it will first invoke the dipose method of addon
   * @param name name of the addon
   * @param addon addon for xterm
   */
  protected setAddon = <T extends ITerminalAddon>(
    name: AddonType,
    addon: T,
  ) => {
    this.getAddon(name)?.dispose();
    this.addons[name] = {
      name: name,
      ctor: addon,
    };
    this.terminal.loadAddon(addon);
  };

  /**
   * deleteAddon will remove the addon from addons, and inovke dipose method of addon.
   * @param name name of the addon
   */
  protected deleteAddon = (name: AddonType) => {
    const addon = this.getAddon(name);
    if (addon) {
      addon.dispose();
      delete this.addons[name];
    }
  };

  /**
   * write support write a bunch of data into terminal, it will split input data
   * by '\n' and iterate the return lines by writing line to the terminal
   * @param data
   */
  public write = (data: string) => {
    if (isEmpty(data)) return;
    data.split('\n').map((line) => {
      this.terminal.writeln(line);
    });
  };

  /**
   * open method is used to initialize the BaseTerminal instance, inside the open
   * method, we will pass the containerElement to initialize the xterm, loading build-in
   * addons and init esssential listeners for the xterm
   * @param containerElement dom element which is used to initialize Terminal
   */
  public open = (containerElement: HTMLElement) => {
    if (this.isXtermOpened) return;
    log('execute open method');
    log('termOptions', this.baseTerminalOptions.xtermOptions);
    if (this.terminal) {
      log('terminal already exists, dispose it first');
      this.terminal.dispose();
      // this.dispose();
    }

    const terminal = new Terminal(
      this.baseTerminalOptions.xtermOptions,
    ) as innerTerminal;
    this.terminal = terminal;
    terminal.fit = () => {
      this.mustGetAddon<FitAddon>('fit').fit();
    };
    for (const name in this.addons) {
      log('load addon =>', name);
      terminal.loadAddon(this.addons[name as AddonType].ctor);
    }
    terminal.open(containerElement);
    this.setRendererType(this.baseTerminalOptions.clientOptions.rendererType);
    this.initListeners();
    terminal.fit();
    this.isXtermOpened = true;
  };

  /**
   * return the terminal object for some special use-cases
   */
  public getTerminal = () => {
    return this.terminal;
  };
}

export default BaseTerminal;
