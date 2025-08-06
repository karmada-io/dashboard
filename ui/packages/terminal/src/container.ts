import SockJS from 'sockjs-client/dist/sockjs';
import BaseTerminal from './base.ts';
import { BaseTerminalOptions } from './typing';
import { getDebugger } from './utils.ts';

interface ContainerTerminalOptions {
  namespace: string;
  pod: string;
  container: string;
  sessionIdUrl: string;
}

export interface SockJSSimpleEvent {
  type: string;

  toString(): string;
}

export interface SJSCloseEvent extends SockJSSimpleEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

export interface SJSMessageEvent extends SockJSSimpleEvent {
  data: string;
}

export interface ShellFrame {
  Op: string;
  Data?: string;
  SessionID?: string;
  Rows?: number;
  Cols?: number;
}

const log = getDebugger('ContainerTerminal');

class ContainerTerminal extends BaseTerminal {
  private containerOptions: ContainerTerminalOptions;
  private sessionId!: string;
  private socket!: WebSocket;
  private connected: boolean = false;
  private connecting: boolean = false;
  // @ts-ignore
  private connectionClosed: boolean = true;

  constructor(
    options: BaseTerminalOptions,
    containerOptions: ContainerTerminalOptions,
  ) {
    super(options);
    this.containerOptions = containerOptions;
  }

  public getSessionId = async () => {
    try {
      const url = this.containerOptions.sessionIdUrl;
      const replacedUrl = url
        .replace('{{namespace}}', this.containerOptions.namespace)
        .replace('{{pod}}', this.containerOptions.pod)
        .replace('{{container}}', this.containerOptions.container);
      log(`request url: ${replacedUrl}`);
      const resp = await fetch(replacedUrl);
      if (resp.ok) {
        const json = await resp.json();
        this.sessionId = json.data.id;
      }
    } catch (e) {
      log(`[ttyd] fetch ${this.containerOptions.sessionIdUrl}: `, e);
    }
  };

  private initContainerListeners = () => {
    const { terminal } = this;
    this.register(
      terminal.onData(this.onTerminalSendString.bind(this)),
      terminal.onResize(this.onTerminalResize.bind(this)),
    );
  };

  public connect = () => {
    if (this.connected || this.connecting) return;
    this.connecting = true;
    this.connectionClosed = false;

    this.socket = new SockJS(`/api/sockjs?${this.sessionId}`);
    const { socket } = this;
    socket.onopen = this.onConnectionOpen.bind(this, this.sessionId);
    socket.onmessage = this.onConnectionMessage.bind(this);
    socket.onclose = this.onConnectionClose.bind(this);
  };

  private onConnectionOpen = (sessionId: string) => {
    const startData = { Op: 'bind', SessionID: sessionId };
    this.socket.send(JSON.stringify(startData));
    this.connected = true;
    this.connecting = false;
    this.connectionClosed = false;

    // Make sure the terminal is with correct display size.
    this.onTerminalResize();

    this.initContainerListeners();

    // Focus on connection
    this.terminal.focus();
  };

  private onConnectionMessage = (evt: SJSMessageEvent) => {
    const msg = JSON.parse(evt.data);
    this.handleConnectionMessage(msg);
  };

  private handleConnectionMessage = (frame: ShellFrame) => {
    if (frame.Op === 'stdout') {
      this.terminal.write(frame.Data || '');
    }
    if (frame.Op === 'toast') {
    }
  };

  private onConnectionClose = (_evt?: SJSCloseEvent) => {
    if (!this.connected) {
      return;
    }
    this.socket.close();
    this.connected = false;
    this.connecting = false;
    this.connectionClosed = true;
  };

  private onTerminalResize(): void {
    if (this.connected) {
      this.socket.send(
        JSON.stringify({
          Op: 'resize',
          Cols: this.terminal.cols,
          Rows: this.terminal.rows,
        }),
      );
    }
  }

  private onTerminalSendString = (str: string) => {
    if (this.connected) {
      this.socket.send(
        JSON.stringify({
          Op: 'stdin',
          Data: str,
          Cols: this.terminal.cols,
          Rows: this.terminal.rows,
        }),
      );
    }
  };
}

export default ContainerTerminal;
