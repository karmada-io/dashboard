/*
Copyright 2026 The Karmada Authors.

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

import { App, Drawer } from 'antd';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth';
import { GetMemberClusterPodDetail } from '@/services/member-cluster/pod';
import SockJS from 'sockjs-client/dist/sockjs';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

interface PodTerminalDrawerProps {
  open: boolean;
  memberClusterName: string;
  namespace: string;
  podName: string;
  onClose: () => void;
}

const PodTerminalDrawer: FC<PodTerminalDrawerProps> = ({
  open,
  memberClusterName,
  namespace,
  podName,
  onClose,
}) => {
  const { message: messageApi } = App.useApp();
  const { token } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const sockRef = useRef<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [containerName, setContainerName] = useState<string | null>(null);

  const fetchContainer = useCallback(async () => {
    if (!open || !memberClusterName || !namespace || !podName) return;
    setIsLoading(true);
    try {
      const ret = await GetMemberClusterPodDetail({
        memberClusterName,
        namespace,
        name: podName,
      });
      const pod = ret.data;
      if (pod?.containers && pod.containers.length > 0) {
        setContainerName(pod.containers[0].name);
      } else {
        void messageApi.error('No containers found for this pod');
      }
    } catch {
      void messageApi.error('Failed to load pod details');
    } finally {
      setIsLoading(false);
    }
  }, [open, memberClusterName, namespace, podName, messageApi]);

  useEffect(() => {
    if (open) {
      setContainerName(null);
      void fetchContainer();
    }
    return () => {
      setContainerName(null);
      sockRef.current?.close();
      termRef.current?.dispose();
    };
  }, [open, fetchContainer]);

  useEffect(() => {
    if (!containerRef.current || !memberClusterName || !namespace || !podName || !containerName) return;

    let cancelled = false;

    const setupTerminal = async () => {
      setIsLoading(true);
      try {
        const sessionResp = await fetch(
          `/clusterapi/${memberClusterName}/api/v1/pod/${namespace}/${podName}/shell/${containerName}`,
          { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : undefined },
        );
        if (!sessionResp.ok) throw new Error(`Session request failed: ${sessionResp.status}`);

        const sessionJson = (await sessionResp.json()) as { id?: string } | { data?: { id?: string } };
        const sessionId = (sessionJson as { id?: string }).id ?? (sessionJson as { data?: { id?: string } }).data?.id;
        if (!sessionId) throw new Error('No session id in response');
        if (cancelled || !containerRef.current) return;

        const term = new Terminal({ cursorBlink: true, scrollback: 1000, fontSize: 14, theme: { background: '#1e1e1e', foreground: '#ffffff' } });
        termRef.current = term;
        term.open(containerRef.current);

        const authQuery = token ? `&Authorization=${encodeURIComponent(`Bearer ${token}`)}` : '';
        const sock = new SockJS(`/clusterapi/${memberClusterName}/api/sockjs?${sessionId}${authQuery}`);
        sockRef.current = sock;

        sock.onopen = () => {
          sock.send(JSON.stringify({ Op: 'bind', SessionID: sessionId }));
          sock.send(JSON.stringify({ Op: 'resize', Cols: term.cols, Rows: term.rows }));
          term.focus();
          setIsLoading(false);
        };
        sock.onmessage = (event: MessageEvent) => {
          try {
            if (typeof event.data !== 'string') return;
            const frame = JSON.parse(event.data) as { Op: string; Data?: string };
            if (frame.Op === 'stdout') term.write(frame.Data || '');
            else if (frame.Op === 'toast' && frame.Data) void messageApi.info(frame.Data);
          } catch { /* ignore */ }
        };
        term.onData((data) => { sock.send(JSON.stringify({ Op: 'stdin', Data: data })); });
      } catch (e) {
        if (!cancelled) void messageApi.error(`Terminal error: ${String(e)}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void setupTerminal();
    return () => {
      cancelled = true;
      sockRef.current?.close();
      termRef.current?.dispose();
    };
  }, [memberClusterName, namespace, podName, containerName, token, messageApi]);

  return (
    <Drawer
      title={`Terminal: ${namespace}/${podName}`}
      placement="bottom"
      height="40%"
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{ header: { padding: '8px 4px' }, body: { padding: 0, height: '100%' } }}
    >
      {!containerName && (
        <div className="h-full flex items-center justify-center text-sm text-gray-500">
          No containers available for this pod.
        </div>
      )}
      {containerName && (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000000' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 text-white text-sm">
              Connecting to pod terminal...
            </div>
          )}
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', visibility: !isLoading ? 'visible' : 'hidden' }}
          />
        </div>
      )}
    </Drawer>
  );
};

export default PodTerminalDrawer;
