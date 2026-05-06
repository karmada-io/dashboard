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

import { App, Button, Drawer, Space, Switch, Table } from 'antd';
import { Icons } from '@/components/icons';
import { WorkloadKind } from '@/services/base';
import { useCallback, useEffect, useRef, useState, FC } from 'react';
import {
  GetMemberClusterWorkloadDetail,
  GetMemberClusterWorkloadEvents,
  WorkloadDetail,
  WorkloadEvent,
} from '@/services/member-cluster/workload';
import dayjs from 'dayjs';
import { GetMemberClusterPodDetail, GetMemberClusterPods, Pod } from '@/services/member-cluster/pod';
import { GetLogs, LogDetails } from '@/services/member-cluster/log';
import { useAuth } from '@/components/auth';
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
}

const MemberClusterWorkloadDetailDrawer: FC<MemberClusterWorkloadDetailDrawerProps> = ({
  open,
  memberClusterName,
  namespace,
  name,
  kind,
  onClose,
}) => {
  const { message: messageApi } = App.useApp();
  const { token } = useAuth();

  const [viewDetail, setViewDetail] = useState<WorkloadDetail | null>(null);
  const [viewEvents, setViewEvents] = useState<WorkloadEvent[]>([]);
  const [viewPods, setViewPods] = useState<Pod[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logDetails, setLogDetails] = useState<LogDetails | null>(null);
  const [logPod, setLogPod] = useState<Pod | null>(null);
  const [logAutoRefresh, setLogAutoRefresh] = useState(false);
  const [logAutoScroll, setLogAutoScroll] = useState(true);
  const logScrollRef = useRef<HTMLPreElement | null>(null);
  const logRefreshTimerRef = useRef<number | null>(null);

  const [attachDrawerOpen, setAttachDrawerOpen] = useState(false);
  const [attachPod, setAttachPod] = useState<Pod | null>(null);

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

  const fetchLogs = useCallback(
    async (pod: Pod | null) => {
      if (!pod) return;
      setLogLoading(true);
      try {
        const ret = await GetLogs({
          memberClusterName,
          namespace: pod.objectMeta.namespace,
          pod: pod.objectMeta.name,
          tailLines: 200,
          timestamps: true,
        });
        setLogDetails(ret.data);
      } catch {
        void messageApi.error('Failed to load pod logs');
      } finally {
        setLogLoading(false);
      }
    },
    [memberClusterName, messageApi],
  );

  useEffect(() => {
    if (logAutoRefresh && logDrawerOpen && logPod) {
      const timer = window.setInterval(() => { void fetchLogs(logPod); }, 5000);
      logRefreshTimerRef.current = timer;
      return () => { window.clearInterval(timer); logRefreshTimerRef.current = null; };
    }
    if (!logAutoRefresh && logRefreshTimerRef.current) {
      window.clearInterval(logRefreshTimerRef.current);
      logRefreshTimerRef.current = null;
    }
    return undefined;
  }, [logAutoRefresh, logDrawerOpen, logPod, fetchLogs]);

  useEffect(() => {
    if (!logAutoScroll || !logScrollRef.current) return;
    const hasContent = Boolean(logDetails?.podLogs?.logs?.length || logDetails?.logs?.length);
    if (!hasContent) return;
    const el = logScrollRef.current;
    el.scrollTop = el.scrollHeight;
  }, [logAutoScroll, logDetails]);

  const handleClose = () => {
    setViewDetail(null);
    setViewEvents([]);
    setViewPods([]);
    onClose();
  };

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
                columns={[
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
                  {
                    title: 'Actions',
                    key: 'actions',
                    width: 180,
                    render: (_: unknown, record: Pod) => (
                      <Space size={4}>
                        <Button
                          size="small"
                          icon={<Icons.terminal width={14} height={14} />}
                          onClick={() => {
                            setLogPod(record);
                            setLogDrawerOpen(true);
                            setLogDetails(null);
                            void fetchLogs(record);
                          }}
                        >
                          Logs
                        </Button>
                        <Button
                          size="small"
                          icon={<Icons.terminal width={14} height={14} />}
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
                  },
                ]}
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

      <Drawer
        title={attachPod ? `Terminal: ${attachPod.objectMeta.namespace}/${attachPod.objectMeta.name}` : 'Pod terminal'}
        placement="bottom"
        size="40%"
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

      <Drawer
        title={logPod ? `Logs: ${logPod.objectMeta.namespace}/${logPod.objectMeta.name}` : 'Pod logs'}
        placement="right"
        size={800}
        open={logDrawerOpen}
        onClose={() => { setLogDrawerOpen(false); setLogDetails(null); setLogPod(null); setLogAutoRefresh(false); }}
        destroyOnHidden
        styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' } }}
      >
        <div className="mb-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-2">
            自动刷新:
            <Switch size="small" checked={logAutoRefresh} onChange={setLogAutoRefresh} />
          </span>
          <span className="flex items-center gap-2">
            自动滚动到底部:
            <Switch size="small" checked={logAutoScroll} onChange={setLogAutoScroll} />
          </span>
        </div>
        {logLoading && <div>Loading logs...</div>}
        {!logLoading && !logDetails && <div>No logs</div>}
        {!logLoading && logDetails && (
          <div className="h-full flex flex-col">
            <div className="mb-2 text-xs text-gray-500">
              Container: {logDetails.info?.containerName || '-'} | From: {logDetails.info?.fromDate || '-'} | To: {logDetails.info?.toDate || '-'}{' '}
              {logDetails.info?.truncated && '(truncated)'}
            </div>
            <pre ref={logScrollRef} className="flex-1 overflow-auto bg-black text-green-400 text-xs p-2 rounded">
              {logDetails.podLogs?.logs?.join('\n') ||
                logDetails.logs?.map((l) => `${l.timestamp} ${l.content}`).join('\n') ||
                'No log content'}
            </pre>
          </div>
        )}
      </Drawer>
    </>
  );
};

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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !memberClusterName || !namespace || !pod || !container) return;

    let cancelled = false;

    const setupTerminal = async () => {
      setIsLoading(true);
      try {
        const sessionResp = await fetch(
          `/clusterapi/${memberClusterName}/api/v1/pod/${namespace}/${pod}/shell/${container}`,
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
  }, [memberClusterName, namespace, pod, container, token, messageApi]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {isLoading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e', color: '#fff', zIndex: 1 }}>
          Connecting...
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default MemberClusterWorkloadDetailDrawer;
