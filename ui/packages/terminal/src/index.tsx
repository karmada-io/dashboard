import { createContext } from 'react';
import BaseTerminal from './base.ts';
import '@xterm/xterm/css/xterm.css';

export const TerminalContext = createContext<{
  terminal: BaseTerminal | null;
}>({
  terminal: null,
});
export { default as TtydTerminal } from './ttyd';
export { default as BaseTerminal } from './base';
