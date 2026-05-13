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

import { App, Button, Drawer, Space, Table, TableColumnsType } from 'antd';
import { WorkloadKind } from '@/services/base';
import { useEffect, useRef, useState, FC } from 'react';
import {
  GetMemberClusterWorkloadDetail,
  GetMemberClusterWorkloadEvents,
  WorkloadDetail,
  WorkloadEvent,
} from '@/services/member-cluster/workload';
import dayjs from 'dayjs';
import { GetMemberClusterPods, Pod } from '@/services/member-cluster/pod';
import PodLogDrawer from '@/components/pod-log-drawer/pod-log-drawer';
import { GetMemberClusterPodDetail } from '@/services/member-cluster/pod';
import { useAuth } from '@/components/auth';
import { Icons } from '@/components/icons';
import SockJS from 'sockjs-client/dist/sockjs';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

interface MemberClusterWorkloadDetailDrawerProps {
  open: boolean;
  memberClusterName: string;
  namespace: string;
  name: string;
  kind: WorkloadKind;
  onClose: () => void;
  showActions?: boolean;
}

interface MemberClusterPodTerminalProps {
  memberClusterName: string;
  namespace: string;
  pod: string;
  container: string;
  token?: string | null;
}

const MemberClusterPodTerminal: FC<MemberClusterPodTerminalProps> = ({
  memberClusterName,
  namespace,
  pod,
  container,
  token,
}) => {
  const { message: messageApi } = App.useApp();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const sockRef = useRef<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current || !memberClusterName || !namespace || !pod || !container) {
      return;
    }

    let cancelled = false;

    const setupTerminal = async () => {
      setIsLoading(true);
      try {
        const sessionResp = await fetch(
          `/clusterapi/${memberClusterName}/api/v1/pod/${namespace}/${pod}/shell/${container}`,
          {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );

        if (!sessionResp.ok) {
          throw new Error(`Session request failed: ${sessionResp.status}`);
        }

        const sessionJson = (await sessionResp.json()) as
          | { id?: string }
          | { data?: { id?: string } };
        const sessionId =
          (sessionJson as { id?: string }).id ??
          (sessionJson as { data?: { id?: string } }).data?.id;

        if (!sessionId) {
          throw new Error('No session id in response');
        }

        if (cancelled || !containerRef.current) return;

        const term = new Terminal({
          cursorBlink: true,
          scrollback: 1000,
          fontSize: 14,
          theme: { background: '#1e1e1e', foreground: '#ffffff' },
        });

        termRef.current = term;
        term.open(containerRef.current);

        const authQuery = token
          ? `&Authorization=${encodeURIComponent(`Bearer ${token}`)}`
          : '';
        const sock = new SockJS(
          `/clusterapi/${memberClusterName}/api/sockjs?${sessionId}${authQuery}`,
        );
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
          } catch { /* ignore malformed frames */ }
        };

        sock.onclose = () => {};

        const dataDisposable = term.onData((data) => {
          sock.send(JSON.stringify({ Op: 'stdin', Data: data, Cols: term.cols, Rows: term.rows }));
        });

        const resizeDisposable = term.onResize(({ cols, rows }) => {
          sock.send(JSON.stringify({ Op: 'resize', Cols: cols, Rows: rows }));
        });

        return () => { dataDisposable.dispose(); resizeDisposable.dispose(); };
      } catch (e: unknown) {
        if (!cancelled) {
          void messageApi.error(`Failed to attach to pod terminal: ${e instanceof Error ? e.message : String(e)}`);
          setIsLoading(false);
        }
      }
    };

    const cleanupDisposablesPromise = setupTerminal();

    return () => {
      cancelled = true;
      if (sockRef.current) { sockRef.current.close(); sockRef.current = null; }
      if (termRef.current) { termRef.current.dispose(); termRef.current = null; }
      void cleanupDisposablesPromise?.then((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [memberClusterName, namespace, pod, container, token, messageApi]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000000' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 text-white text-sm">
          Connecting to pod terminal...
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          visibility: !isLoading ? 'visible' : 'hidden',
        }}
      />
    </div>
  );
};

const MemberClusterWorkloadDetailDrawer: FC<MemberClusterWorkloadDetailDrawerProps> = ({
  open,
  memberClusterName,
  namespace,
  name,
  kind,
  onClose,
  showActions = false,
}) => {
  const [viewDetail, setViewDetail] = useState<WorkloadDetail | null>(null);
  const [viewEvents, setViewEvents] = useState<WorkloadEvent[]>([]);
  const [viewPods, setViewPods] = useState<Pod[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const [logPod, setLogPod] = useState<Pod | null>(null);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);

  const [attachDrawerOpen, setAttachDrawerOpen] = useState(false);
  const [attachPod, setAttachPod] = useState<Pod | null>(null);

  const { token } = useAuth();

  useEffect(() => {
    if (!open || !memberClusterName || !namespace || !name || !kind) return;

    setViewLoading(true);
    void Promise.all([
      GetMemberClusterWorkloadDetail({ memberClusterName, namespace, name, kind }),
      GetMemberClusterWorkloadEvents({ memberClusterName, namespace, name, kind }),
      GetMemberClusterPods({ memberClusterName, namespace }),
    ]).then(([detailResp, eventsRet, podsRet]) => {
      const workloadDetail = (detailResp?.data ?? {}) as WorkloadDetail;
      setViewDetail(workloadDetail);
      setViewEvents(eventsRet?.data?.events || []);
      const selector = workloadDetail.selector;
      setViewPods(
        selector
          ? (podsRet?.data?.pods || []).filter((pod) =>
              Object.entries(selector).every(
                ([k, v]) => pod.objectMeta.labels?.[k] === v,
              ),
            )
          : [],
      );
    }).finally(() => setViewLoading(false));
  }, [open, memberClusterName, namespace, name, kind]);

  const handleClose = () => {
    setViewDetail(null);
    setViewEvents([]);
    setViewPods([]);
    onClose();
  };

  const podColumns: TableColumnsType<Pod> = [
    {
      title: 'Name',
      dataIndex: ['objectMeta', 'name'],
      key: 'name',
      render: (n: string) => <span className="text-xs">{n}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <span className="text-xs">{s}</span>,
    },
    {
      title: 'Phase',
      dataIndex: 'podPhase',
      key: 'podPhase',
      render: (p: string) => <span className="text-xs">{p}</span>,
    },
    {
      title: 'Pod IP',
      dataIndex: 'podIP',
      key: 'podIP',
      render: (ip: string) => <span className="text-xs">{ip || '-'}</span>,
    },
    {
      title: 'Node',
      dataIndex: 'nodeName',
      key: 'nodeName',
      render: (node: string) => <span className="text-xs">{node || '-'}</span>,
    },
    {
      title: 'Restarts',
      dataIndex: 'restartCount',
      key: 'restartCount',
      render: (count: number) => <span className="text-xs">{count || 0}</span>,
    },
  ];

  if (showActions) {
    podColumns.push({
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: Pod) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<Icons.post width={14} height={14} />}
            title="View Pod logs"
            onClick={() => {
              setLogPod(record);
              setLogDrawerOpen(true);
            }}
          >
            Logs
          </Button>
          <Button
            size="small"
            icon={<Icons.terminal width={14} height={14} />}
            title="Attach to Pod"
            onClick={async () => {
              const ret = await GetMemberClusterPodDetail({
                memberClusterName,
                namespace: record.objectMeta.namespace,
                name: record.objectMeta.name,
              });
              setAttachPod(ret.data);
              setAttachDrawerOpen(true);
            }}
          >
            Attach
          </Button>
        </Space>
      ),
    });
  }

  return (
    <>
      <Drawer
        title="Workload details"
        placement="right"
        size={800}
        open={open}
        onClose={handleClose}
        destroyOnHidden
      >
        {viewLoading && <div>Loading...</div>}
        {!viewLoading && viewDetail && (
          <div className="space-y-4">
            <div>
              <div className="font-semibold mb-2">Basic Info</div>
              <div>Name: {viewDetail.objectMeta?.name}</div>
              <div>Namespace: {viewDetail.objectMeta?.namespace}</div>
              <div>
                Created:{' '}
                {viewDetail.objectMeta?.creationTimestamp
                  ? dayjs(viewDetail.objectMeta.creationTimestamp).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </div>
              <div>
                Images:{' '}
                <code className="text-xs">{viewDetail.containerImages?.join(', ')}</code>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2">Pods</div>
              <div className="mb-2">
                Running: {viewDetail.pods?.running} / Desired: {viewDetail.pods?.desired}
              </div>
              <Table
                size="small"
                rowKey={(record) => record.objectMeta.name}
                columns={podColumns}
                dataSource={viewPods}
                pagination={false}
                scroll={{ y: 300 }}
                locale={{ emptyText: 'No pods found' }}
              />
            </div>
            <div>
              <div className="font-semibold mb-2">Events</div>
              <div className="space-y-1 max-h-64 overflow-auto text-xs">
                {viewEvents.map((e) => (
                  <div key={e.objectMeta.uid} className="border-b pb-1">
                    <div>[{e.type}] {e.reason}</div>
                    <div>{e.message}</div>
                    <div className="text-gray-500">{e.sourceComponent} · {e.lastSeen}</div>
                  </div>
                ))}
                {!viewEvents.length && <div>No events</div>}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {showActions && (
        <>
          <PodLogDrawer
            memberClusterName={memberClusterName}
            namespace={logPod?.objectMeta.namespace || ''}
            podName={logPod?.objectMeta.name || ''}
            open={logDrawerOpen}
            onClose={() => {
              setLogDrawerOpen(false);
              setLogPod(null);
            }}
          />

          <Drawer
            title={
              attachPod
                ? `Terminal: ${attachPod.objectMeta.namespace}/${attachPod.objectMeta.name}`
                : 'Pod terminal'
            }
            placement="bottom"
            height="40%"
            open={attachDrawerOpen}
            onClose={() => { setAttachDrawerOpen(false); setAttachPod(null); }}
            destroyOnHidden
            styles={{ header: { padding: '8px 4px' }, body: { padding: 0, height: '100%' } }}
          >
            {attachPod && attachPod.containers && attachPod.containers.length > 0 && (
              <MemberClusterPodTerminal
                key={`${attachPod.objectMeta.namespace}-${attachPod.objectMeta.name}-${attachPod.containers[0].name}`}
                memberClusterName={memberClusterName}
                namespace={attachPod.objectMeta.namespace}
                pod={attachPod.objectMeta.name}
                container={attachPod.containers[0].name}
                token={token}
              />
            )}
            {attachPod && (!attachPod.containers || attachPod.containers.length === 0) && (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                No containers available for this pod.
              </div>
            )}
          </Drawer>
        </>
      )}
    </>
  );
};

export default MemberClusterWorkloadDetailDrawer;
