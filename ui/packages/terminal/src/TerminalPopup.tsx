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


      // Define the Ttyd-specific options for the WebSocket connection
      const ttydOptions = {
        wsUrl: 'ws://localhost:7681/ws', // Adjust with your ttyd endpoint
        tokenUrl: 'https://karmada-apiserver.karmada-system.svc.cluster.local:5443', // Adjust with your token API endpoint
        flowControl: {
          limit: 10000,
          highWater: 50,
          lowWater: 10,
        },
      };      
        
      // Create a new advanced terminal instance
      //terminalInstanceRef.current = new BaseTerminal(terminalOptions);

      // Open the terminal on the container element
      //terminalInstanceRef.current.open(containerRef.current);

      // Attach onData listener after opening the terminal
      //terminalInstanceRef.current.attachOnDataListener((data: string) => {
        //console.log('User typed:', data);
      
        // Local echo: write typed characters back to the terminal
        // (Only do this if you don't have a real shell backend, or you'll double-echo.)
        //terminalInstanceRef.current.write(data);
      //});

      // Create a new TtydTerminal instance
      ttydTerminalRef.current = new TtydTerminal(terminalOptions, ttydOptions);

      // Open the terminal on the container element
      ttydTerminalRef.current.open(containerRef.current);

      // Optionally, attach an onData listener if you want to monitor input
      ttydTerminalRef.current.attachOnDataListener((data: string) => {
        console.log('User typed:', data);
        // Note: TtydTerminal.sendData internally sends data via WebSocket
      });


      // Set focus to the terminal to allow input
      //terminalInstanceRef.current.getTerminal().focus();

      // Optionally, write an initial welcome message
      //terminalInstanceRef.current.write('Welcome to the Advanced Terminal!\r\n');

      // Connect to the ttyd backend via WebSocket
      ttydTerminalRef.current.connect();      

      // Optionally, you can add more configuration or event listeners here

      return () => {
        // Dispose of the terminal when the component unmounts or is closed
        terminalInstanceRef.current?.dispose();
        terminalInstanceRef.current = null;
      };
    }
  }, [isOpen]);

      //return () => {
        //xterm.current?.dispose();
      //};
    //}
  //}, [isOpen]);

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