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
import React, { useEffect, useRef } from 'react';
//import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';// Import xterm styles
//import { FitAddon } from '@xterm/addon-fit';
import BaseTerminal from './base.ts';
import { BaseTerminalOptions } from './typing';
import TtydTerminal from './ttyd';

interface TerminalPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvancedTerminalPopup: React.FC<TerminalPopupProps> = ({ isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<BaseTerminal | null>(null);
  const ttydTerminalRef = useRef<TtydTerminal | null>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Define your terminal options:

      const terminalOptions: BaseTerminalOptions = {
        // Options for xterm.js instance
        xtermOptions: {
          cursorBlink: true,
          scrollback: 1000,
          fontSize: 14,
          rows: 24,
          cols: 80,
          theme: {
            background: '#1e1e1e',
            foreground: '#ffffff'
          },
        },
        // Client-specific options such as renderer type
        clientOptions: {
          rendererType: "webgl",
          disableLeaveAlert: false,
          disableResizeOverlay: false,
          enableZmodem: false,
          enableSixel: false,
          enableTrzsz: false,
          trzszDragInitTimeout: 5000, // Example timeout value
          isWindows: false,         // Set this based on the OS
          unicodeVersion: "11"      // Unicode version as a string
        },
      };





  // Trigger backend to create pod & service, then connect
  fetch('/api/v1/terminal')
    .then(response => {
      if (!response.ok) throw new Error('Failed to trigger terminal');
      return response.json();
    })
    .then((wrapper: { code: number; message: string; data: { podName: string; port: string } }) => {
      // Extract actual data from wrapper
      const { data } = wrapper;
      console.log('Server data:', data);
      const { podName, port } = data;
      if (!data.port) {
        throw new Error(`Invalid port returned from server: "${data.port}"`);
      }
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.hostname;
      //const wsUrl = `${protocol}://${host}:${data.port}/`;
      //const wsUrl = `${protocol}://${host}/api/v1/terminal/ws/${data.podName}`;
      //const wsUrl = `ws://localhost:${data.port}/api/v1/terminal/ws/${data.podName}`;
      //const wsUrl = `${protocol}://${host}/api/v1/terminal/ws/${data.podName}`;
      //const port = window.location.port || '8000';
      //const wsUrl    = `${protocol}://${host}:8000/api/v1/terminal/ws/${podName}`;
      //const wsUrl = `${protocol}://${window.location.hostname}:${port}/`;
      const wsUrl = `${protocol}://${host}/ws/${podName}`;

      console.log('protocol:', protocol);
      console.log('host:    ', host);
      console.log('port:    ', data.port);
      console.log('wsUrl:   ', wsUrl);


      // WebSocket options for ttyd
      const ttydOptions = {
        wsUrl,
        tokenUrl: 'https://karmada-apiserver.karmada-system.svc.cluster.local:5443',
        flowControl: { limit: 10000, highWater: 50, lowWater: 10 },
      };

      // Initialize and open terminal
      ttydTerminalRef.current = new TtydTerminal(terminalOptions, ttydOptions);
      ttydTerminalRef.current.open(containerRef.current!);
      ttydTerminalRef.current.attachOnDataListener(data => console.log('User typed:', data));
      console.log('Connecting to', wsUrl);
      ttydTerminalRef.current.connect();
    })
    .catch(error => console.error('Error triggering terminal:', error));

  return () => {
    terminalInstanceRef.current?.dispose();
    terminalInstanceRef.current = null;
  };
}
  }, [isOpen]);

  return (
    <div
      style={{
        display: isOpen ? 'block' : 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '30%',
        backgroundColor: 'white',
        zIndex: 9999,
        borderTop: '1px solid #ccc',
      }}
    >
      <div
        ref={containerRef}
        tabIndex={0}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '5px',
          right: '10px',
          zIndex: 10001,
        }}
      >
        Close
      </button>
    </div>
  );
};

export default AdvancedTerminalPopup;