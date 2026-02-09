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

import { App, Button, Drawer, Input, Select, Space, Switch, Table, TableColumnProps } from 'antd';
import { Icons } from '@/components/icons';
import { useMemberClusterContext, useMemberClusterNamespace } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { WorkloadKind } from '@/services/base';
import { useCallback, useEffect, useRef, useState, FC } from 'react';
import {
  GetMemberClusterWorkloadDetail,
  GetMemberClusterWorkloadEvents,
  GetMemberClusterWorkloads,
  Workload,
  WorkloadDetail,
  WorkloadEvent,
} from '@/services/member-cluster/workload';
import i18nInstance from '@/utils/i18n';
import dayjs from 'dayjs';
import { stringify, parse } from 'yaml';
import Editor from '@monaco-editor/react';
import { GetResource, PutResource } from '@/services/member-cluster/unstructured';
import {
  GetMemberClusterPodDetail,
  GetMemberClusterPods,
  Pod
} from '@/services/member-cluster/pod';
import { GetLogs, LogDetails } from '@/services/member-cluster/log';
import { useAuth } from '@/components/auth';
import SockJS from 'sockjs-client/dist/sockjs';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

export default function MemberClusterDeployments() {
  const { message: messageApi } = App.useApp();
  const { memberClusterName } = useMemberClusterContext();
  const [filter, setFilter] = useState<{
    kind: WorkloadKind;
    selectedWorkSpace: string;
    searchText: string;
  }>({
    kind: WorkloadKind.Deployment,
    selectedWorkSpace: '',
    searchText: '',
  });
  const { nsOptions, isNsDataLoading } = useMemberClusterNamespace({ memberClusterName, });
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<WorkloadDetail | null>(null);
  const [viewEvents, setViewEvents] = useState<WorkloadEvent[]>([]);
  const [viewPods, setViewPods] = useState<Pod[]>([]);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logDetails, setLogDetails] = useState<LogDetails | null>(null);
  const [logPod, setLogPod] = useState<Pod | null>(null);
  const [logAutoRefresh, setLogAutoRefresh] = useState<boolean>(false);
  const [logAutoScroll, setLogAutoScroll] = useState<boolean>(true);
  const logScrollRef = useRef<HTMLPreElement | null>(null);
  const logRefreshTimerRef = useRef<number | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [attachDrawerOpen, setAttachDrawerOpen] = useState(false);
  const [attachPod, setAttachPod] = useState<Pod | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['GetWorkloads', memberClusterName, filter],
    queryFn: async () => {
      const workloads = await GetMemberClusterWorkloads({
        memberClusterName: memberClusterName,
        kind: filter.kind,
        namespace: filter.selectedWorkSpace,
        keyword: filter.searchText,
      });
      return workloads.data;
    },
  });

  const { token } = useAuth();

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
      const timer = window.setInterval(() => {
        void fetchLogs(logPod);
      }, 5000);
      logRefreshTimerRef.current = timer;
      return () => {
        window.clearInterval(timer);
        logRefreshTimerRef.current = null;
      };
    }

    if (!logAutoRefresh && logRefreshTimerRef.current) {
      window.clearInterval(logRefreshTimerRef.current);
      logRefreshTimerRef.current = null;
    }
    return undefined;
  }, [logAutoRefresh, logDrawerOpen, logPod, fetchLogs]);

  useEffect(() => {
    if (!logAutoScroll || !logScrollRef.current) {
      return;
    }

    const hasContent = Boolean(
      logDetails?.podLogs?.logs?.length || logDetails?.logs?.length,
    );
    if (!hasContent) {
      return;
    }

    const el = logScrollRef.current;
    el.scrollTop = el.scrollHeight;
  }, [logAutoScroll, logDetails]);

  // placeholder for future conditional fetch logic
  // const enableViewFetch = useMemo(() => {
  //   return !!(viewDrawerOpen && viewDetail);
  // }, [viewDrawerOpen, viewDetail]);

  const columns: TableColumnProps<Workload>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_name: string, record: Workload) => (
        <>{record.objectMeta.name}</>
      ),
    },
    {
      title: 'Namespace',
      dataIndex: 'namespace',
      key: 'namespace',
      render: (_name: string, record: Workload) => (
        <>{record.objectMeta.namespace}</>
      ),
    },
    {
      title: 'Ready',
      dataIndex: 'replicas',
      key: 'replicas',
      render: (_status: string, record: Workload) => (
        <>
          {record.pods?.running}/{record.pods?.desired}
        </>
      ),
    },
    {
      title: 'Images',
      dataIndex: 'images',
      key: 'images',
      render: (_, record: Workload) => (
        <code className="text-xs">{record.containerImages?.[0]}</code>
      ),
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      render: (_, r) => {
        const create = dayjs(r.objectMeta.creationTimestamp);
        return create.fromNow();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Workload) => (
        <Space>
          <Button
            icon={<Icons.eye width={16} height={16} />}
            title="View details"
            onClick={async () => {
              setViewLoading(true);
              try {
                const [detailResp, eventsRet, podsRet] = await Promise.all([
                  GetMemberClusterWorkloadDetail({
                    memberClusterName,
                    namespace: record.objectMeta.namespace,
                    name: record.objectMeta.name,
                    kind: record.typeMeta.kind as WorkloadKind,
                  }),
                  GetMemberClusterWorkloadEvents({
                    memberClusterName,
                    namespace: record.objectMeta.namespace,
                    name: record.objectMeta.name,
                    kind: record.typeMeta.kind as WorkloadKind,
                  }),
                  GetMemberClusterPods({
                    memberClusterName,
                    namespace: record.objectMeta.namespace,
                  }),
                ]);
                setViewDetail((detailResp?.data ?? ({} as any)) as WorkloadDetail);
                setViewEvents(eventsRet?.data?.events || []);

                const workloadDetail = (detailResp?.data ?? ({} as any)) as WorkloadDetail;
                const selector = workloadDetail.selector;
                setViewPods(
                    selector
                        ? (podsRet?.data?.pods || []).filter((pod) =>
                            Object.entries(selector).every(
                                ([key, value]) => pod.objectMeta.labels?.[key] === value,
                            ),
                        )
                        : [],
                );

                setViewDrawerOpen(true);
              } finally {
                setViewLoading(false);
              }
            }}
          >
            View
          </Button>
          <Button
            icon={<Icons.edit width={16} height={16} />}
            title="Edit deployment"
            onClick={async () => {
              try {
                const ret = await GetResource({
                  memberClusterName,
                  kind: record.typeMeta.kind,
                  name: record.objectMeta.name,
                  namespace: record.objectMeta.namespace,
                });

                if (ret.status !== 200) {
                  void messageApi.error('Failed to load deployment');
                  return;
                }

                setEditContent(stringify(ret.data));
                setEditModalOpen(true);
              } catch (e) {
                void messageApi.error(`Failed to load deployment ${(e as any)}`);
              }
            }}
          >
            Edit
          </Button>
          {/* 
          <Button icon={<Icons.delete width={16} height={16} />}  danger title="Delete deployment">
          Delete
          </Button> */}
        </Space>
      ),
    },
  ];
  return (
    <div className="h-full w-full flex flex-col p-4">
      <div className={'flex flex-row space-x-4 mb-4'}>
        <h3 className={'leading-[32px]'}>
          {i18nInstance.t('280c56077360c204e536eb770495bc5f', '命名空间')}：
        </h3>
        <Select
          options={nsOptions}
          className={'min-w-[200px]'}
          value={filter.selectedWorkSpace}
          loading={isNsDataLoading}
          showSearch
          allowClear
          onChange={(v) => {
            setFilter({
              ...filter,
              selectedWorkSpace: v,
            });
          }}
        />
        <Input.Search
          placeholder={i18nInstance.t(
            'cfaff3e369b9bd51504feb59bf0972a0',
            '按命名空间搜索',
          )}
          className={'w-[300px]'}
          onPressEnter={(e) => {
            const input = e.currentTarget.value;
            setFilter({
              ...filter,
              searchText: input,
            });
          }}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <Table
          rowKey={(record) =>
            `${record.objectMeta.namespace}-${record.objectMeta.name}`
          }
          columns={columns}
          dataSource={data?.deployments || []}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} deployments`,
          }}
          // scroll={{ y: 'calc(100vh - 400px)' }}
          loading={isLoading}
        />
      </div>

      <Drawer
        title="Deployment details"
        placement="right"
        size={800}
        open={viewDrawerOpen}
        onClose={() => {
          setViewDrawerOpen(false);
          setViewDetail(null);
          setViewEvents([]);
          setViewPods([]);
        }}
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
                  ? dayjs(viewDetail.objectMeta.creationTimestamp).format(
                    'YYYY-MM-DD HH:mm:ss',
                  )
                  : '-'}
              </div>
              <div>
                Images:{' '}
                <code className="text-xs">
                  {viewDetail.containerImages?.join(', ')}
                </code>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2">Pods</div>
              <div className="mb-2">
                Running: {viewDetail.pods?.running} / Desired:{' '}
                {viewDetail.pods?.desired}
              </div>
              <Table
                size="small"
                rowKey={(record) => record.objectMeta.name}
                columns={[
                  {
                    title: 'Name',
                    dataIndex: ['objectMeta', 'name'],
                    key: 'name',
                    render: (name: string) => <span className="text-xs">{name}</span>,
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string) => <span className="text-xs">{status}</span>,
                  },
                  {
                    title: 'Phase',
                    dataIndex: 'podPhase',
                    key: 'podPhase',
                    render: (phase: string) => <span className="text-xs">{phase}</span>,
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
                    render: (_: unknown, record: Pod) => {
                      return (<Space size={4}>
                        <Button
                            size="small"
                            icon={<Icons.terminal width={14} height={14} />}
                            title="View Pod logs"
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
                            title="Attach to Pod"
                            // disabled={!record.containers || !record.containers.length}
                            onClick={async () => {
                              const ret = await GetMemberClusterPodDetail({
                                memberClusterName,
                                namespace: record.objectMeta.namespace,
                                name: record.objectMeta.name,
                              })
                              setAttachPod(ret.data);
                              setAttachDrawerOpen(true);
                            }}
                        >
                          Attach
                        </Button>
                      </Space>)
                    },
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
                    <div>
                      [{e.type}] {e.reason}
                    </div>
                    <div>{e.message}</div>
                    <div className="text-gray-500">
                      {e.sourceComponent} · {e.lastSeen}
                    </div>
                  </div>
                ))}
                {!viewEvents.length && <div>No events</div>}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer
        title={
          attachPod
            ? `Terminal: ${attachPod.objectMeta.namespace}/${attachPod.objectMeta.name}`
            : 'Pod terminal'
        }
        placement="bottom"
        size="40%"
        open={attachDrawerOpen}
        onClose={() => {
          setAttachDrawerOpen(false);
          setAttachPod(null);
        }}
        destroyOnHidden
        styles={{
          header: {
            padding: '8px 4px'
          },
          body: { padding: 0, height: '100%' }
        }}
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
        title={
          logPod
            ? `Logs: ${logPod.objectMeta.namespace}/${logPod.objectMeta.name}`
            : 'Pod logs'
        }
        placement="right"
        size={800}
        open={logDrawerOpen}
        onClose={() => {
          setLogDrawerOpen(false);
          setLogDetails(null);
          setLogPod(null);
          setLogAutoRefresh(false);
        }}
        destroyOnHidden
        styles={{
          body: {
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: '100%',
          }
        }}
      >
        <div className="mb-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-2">
            自动刷新:
            <Switch
              size="small"
              checked={logAutoRefresh}
              onChange={(checked) => setLogAutoRefresh(checked)}
            />
          </span>
          <span className="flex items-center gap-2">
            自动滚动到底部:
            <Switch
              size="small"
              checked={logAutoScroll}
              onChange={(checked) => setLogAutoScroll(checked)}
            />
          </span>
        </div>

        {logLoading && <div>Loading logs...</div>}
        {!logLoading && !logDetails && <div>No logs</div>}
        {!logLoading && logDetails && (
          <div className="h-full flex flex-col">
            <div className="mb-2 text-xs text-gray-500">
              Container: {logDetails.info?.containerName || '-'} | From:{' '}
              {logDetails.info?.fromDate || '-'} | To: {logDetails.info?.toDate || '-'}{' '}
              {logDetails.info?.truncated && '(truncated)'}
            </div>
            <pre
              ref={logScrollRef}
              className="flex-1 overflow-auto bg-black text-green-400 text-xs p-2 rounded"
            >
              {logDetails.podLogs?.logs?.join('\n') ||
                logDetails.logs?.map((l) => `${l.timestamp} ${l.content}`).join('\n') ||
                'No log content'}
            </pre>
          </div>
        )}
      </Drawer>

      <Drawer
        title="Edit deployment (YAML)"
        placement="right"
        size={900}
        open={editModalOpen}
        onClose={() => {
          if (!editSubmitting) {
            setEditModalOpen(false);
            setEditContent('');
          }
        }}
        destroyOnHidden
        extra={
          <Space>
            <Button
              type="primary"
              loading={editSubmitting}
              onClick={async () => {
                setEditSubmitting(true);
                try {
                  const yamlObject = parse(editContent) as Record<string, any>;
                  const kind = (yamlObject.kind || '') as string;
                  const metadata = (yamlObject.metadata || {}) as {
                    name?: string;
                    namespace?: string;
                  };
                  const name = (metadata.name || '');
                  const namespace = (metadata.namespace || '');

                  const ret = await PutResource({
                    memberClusterName,
                    kind,
                    name,
                    namespace,
                    content: yamlObject,
                  });
                  console.log('update result', ret);
                  setEditModalOpen(false);
                  setEditContent('');
                } finally {
                  setEditSubmitting(false);
                }
              }}
            >
              Save
            </Button>
          </Space>
        }
      >
        <Editor
          height="600px"
          defaultLanguage="yaml"
          value={editContent}
          theme="vs"
          options={{
            theme: 'vs',
            lineNumbers: 'on',
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: 'on',
          }}
          onChange={(value) => setEditContent(value || '')}
        />
      </Drawer>
    </div>
  );
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
    if (!containerRef.current) {
      return;
    }
    if (!memberClusterName || !namespace || !pod || !container) {
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
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : undefined,
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

        if (cancelled || !containerRef.current) {
          return;
        }

        const term = new Terminal({
          cursorBlink: true,
          scrollback: 1000,
          fontSize: 14,
          theme: {
            background: '#1e1e1e',
            foreground: '#ffffff',
          },
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
          const bindFrame = { Op: 'bind', SessionID: sessionId };
          sock.send(JSON.stringify(bindFrame));

          const resizeFrame = {
            Op: 'resize',
            Cols: term.cols,
            Rows: term.rows,
          };
          sock.send(JSON.stringify(resizeFrame));

          term.focus();
          setIsLoading(false);
        };

        sock.onmessage = (event: MessageEvent) => {
          try {
            if (typeof event.data !== 'string') {
              return;
            }
            const frame = JSON.parse(event.data) as {
              Op: string;
              Data?: string;
            };
            if (frame.Op === 'stdout') {
              term.write(frame.Data || '');
            } else if (frame.Op === 'toast' && frame.Data) {
              void messageApi.info(frame.Data);
            }
          } catch {
            // ignore malformed frames
          }
        };

        sock.onclose = () => {
          // optional toast or cleanup hook
        };

        const dataDisposable = term.onData((data) => {
          const frame = {
            Op: 'stdin',
            Data: data,
            Cols: term.cols,
            Rows: term.rows,
          };
          sock.send(JSON.stringify(frame));
        });

        const resizeDisposable = term.onResize(({ cols, rows }) => {
          const frame = {
            Op: 'resize',
            Cols: cols,
            Rows: rows,
          };
          sock.send(JSON.stringify(frame));
        });

        return () => {
          dataDisposable.dispose();
          resizeDisposable.dispose();
        };
      } catch (e: unknown) {
        if (!cancelled) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          void messageApi.error(
            `Failed to attach to pod terminal: ${errorMessage}`,
          );
          setIsLoading(false);
        }
      }
    };

    const cleanupDisposablesPromise = setupTerminal();

    return () => {
      cancelled = true;
      if (sockRef.current) {
        sockRef.current.close();
        sockRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
      void cleanupDisposablesPromise?.then((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, [memberClusterName, namespace, pod, container, token, messageApi]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
      }}
    >
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
