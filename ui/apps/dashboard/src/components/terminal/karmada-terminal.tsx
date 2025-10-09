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

import React, { useEffect, useRef, useState } from 'react';
import { ContainerTerminal, BaseTerminalOptions } from '@karmada/terminal';
import { CreateKarmadaTerminal } from '@/services/terminal.ts';
import { Button, Spin } from 'antd';
import { Icons } from '@/components/icons';
import { useAuth } from '@/components/auth';

interface KarmadaTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KarmadaTerminal: React.FC<KarmadaTerminalProps> = ({
  isOpen,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerTerminalRef = useRef<ContainerTerminal | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { token } = useAuth();
  useEffect(() => {
    if (!isOpen || !containerRef.current || containerTerminalRef.current) {
      return;
    }
    // async-await function to simplify the code
    void (async () => {
      setIsLoading(true);
      // create(only if the terminal pod not exist) + inject
      const terminalData = await CreateKarmadaTerminal();
      const { namespace, podName, container } = terminalData.data;

      // Terminal options
      const terminalOptions: BaseTerminalOptions = {
        xtermOptions: {
          cursorBlink: true,
          scrollback: 1000,
          fontSize: 14,
          // rows: 24,
          // cols: 80,
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
      // 3) Initialize and connect your TtydTerminal
      const terminal = new ContainerTerminal(terminalOptions, {
        namespace,
        pod: podName,
        container,
        sessionIdUrl:
          '/api/v1/terminal/pod/{{namespace}}/{{pod}}/shell/{{container}}',
        wsUrl: '/api/v1/terminal/sockjs',
        extraHeader: {
          Authorization: `Bearer ${token}`,
        },
      });
      containerTerminalRef.current = terminal;
      terminal
        .getSessionId()
        .then(() => {
          terminal.open(containerRef.current!);
          terminal.connect();
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('get sessionId error', err);
          setIsLoading(false);
        });
    })();
  }, [isOpen, setIsLoading]);

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
      <Spin
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
        spinning={isLoading}
      />
      <div
        style={{
          width: '100%',
          height: '20px',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          type="link"
          icon={<Icons.close width={16} height={16} color={'#000000'} />}
          style={{ justifySelf: 'right' }}
          onClick={onClose}
        ></Button>
      </div>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 'calc(100% - 20px)',
          visibility: !isLoading ? 'visible' : 'hidden',
        }}
      />
    </div>
  );
};

export default KarmadaTerminal;
