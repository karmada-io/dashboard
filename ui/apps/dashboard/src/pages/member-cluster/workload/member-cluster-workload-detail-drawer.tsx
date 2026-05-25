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

import { Drawer, Table } from 'antd';
import { WorkloadKind } from '@/services/base';
import { useEffect, useState, FC } from 'react';
import {
  GetMemberClusterWorkloadDetail,
  GetMemberClusterWorkloadEvents,
  WorkloadDetail,
  WorkloadEvent,
} from '@/services/member-cluster/workload';
import dayjs from 'dayjs';
import { GetMemberClusterPods, Pod } from '@/services/member-cluster/pod';

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
  const [viewDetail, setViewDetail] = useState<WorkloadDetail | null>(null);
  const [viewEvents, setViewEvents] = useState<WorkloadEvent[]>([]);
  const [viewPods, setViewPods] = useState<Pod[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

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
    </>
  );
};

export default MemberClusterWorkloadDetailDrawer;
