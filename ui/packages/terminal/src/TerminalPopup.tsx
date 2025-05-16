import React, { useEffect, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
//import BaseTerminal from './base.ts';
import { BaseTerminalOptions } from './typing';
import TtydTerminal from './ttyd';
import SockJS from 'sockjs-client';

interface TerminalPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvancedTerminalPopup: React.FC<TerminalPopupProps> = ({
  isOpen,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ttydTerminalRef = useRef<TtydTerminal | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    let sock: any = null;

    // 1) get auth token
    fetch('/api/v1/auth/token')
      .then((r) => {
        if (!r.ok) throw new Error('no token');
        return r.json();
      })
      // .then((t: { token: string }) =>
      //   // 2) create + inject
      //   fetch('/api/v1/terminal', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       'Authorization': `Bearer ${t.token}`,
      //     },
      //   })
      // )
      .then((r) => {
        if (!r.ok) throw new Error('terminal create failed');
        return r.json();
      })
      .then(
        (r: {
          data: { podName: string; namespace: string; container: string };
          sessionID: string;
          wsURL: string;
        }) => {
          const {
            podName = 'karmada-ttyd-admin',
            namespace = 'karmada-system',
            container = 'karmada-ttyd-admin',
          } = r.data;
          const tpl =
            '/api/v1/terminal/pod/{{namespace}}/{{pod}}/shell/{{container}}';
          const replacedUrl = tpl
            .replace('{{namespace}}', namespace)
            .replace('{{pod}}', podName)
            .replace('{{container}}', container);
          console.log('replacedUrl', replacedUrl);
          return fetch(replacedUrl);
        },
      )
      .then((r) => {
        if (!r.ok) throw new Error('create session failed');
        return r.json();
      })
      .then((wrapper: { data: { id: string } }) => {
        // 3) Destructure the returned data
        // const { wsURL, sessionID, data} = wrapper;
        // const {podName, namespace,  container} = data
        const sessionID = wrapper.data.id;

        // 4) Use wsURL directly to establish SockJS connection
        const sock = new SockJS(`/api/v1/terminal/sockjs?${sessionID}`);
        //const sock = new SockJS('http://localhost:5173/api/v1/terminal/ws')  // Using wsURL directly from the response

        sock.onopen = () => console.log('SockJS OPEN');
        sock.send(JSON.stringify({ op: 'bind', sessionId: sessionID })); // Bind the session to SockJS

        sock.onmessage = (e) => console.log('FROM pod →', e.data);
        // 4) Terminal options
        const terminalOptions: BaseTerminalOptions = {
          xtermOptions: {
            cursorBlink: true,
            scrollback: 1000,
            fontSize: 14,
            rows: 24,
            cols: 80,
            theme: {
              background: '#1e1e1e',
              foreground: '#ffffff',
            },
          },
          clientOptions: {
            rendererType: 'webgl',
            disableLeaveAlert: false,
            disableResizeOverlay: false,
            enableZmodem: false,
            enableSixel: false,
            enableTrzsz: false,
            trzszDragInitTimeout: 5000,
            isWindows: false,
            unicodeVersion: '11',
          },
        };

        // 5) Initialize and connect your TtydTerminal
        ttydTerminalRef.current = new TtydTerminal(terminalOptions, {
          sock, // <-- pass your SockJS instance here
          tokenUrl: '/api/v1/auth/token',
          flowControl: { limit: 10000, highWater: 50, lowWater: 10 },
        });
        ttydTerminalRef.current.open(containerRef.current!);
        ttydTerminalRef.current.attachOnDataListener((d) =>
          console.log('User typed:', d),
        );
        ttydTerminalRef.current.connect();
      })
      .catch((err) => console.error('Error setting up terminal:', err));

    return () => {
      ttydTerminalRef.current?.dispose();
      ttydTerminalRef.current = null;
      //if (sock) sock.close();
      //sock.onclose   = () => console.log('SockJS CLOSED');
      if (sock) {
        sock.close(); // Close the WebSocket connection properly
        sock.onclose = () => console.log('SockJS CLOSED');
      }
    };
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
        style={{ width: '100%', height: '100%' }}
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
