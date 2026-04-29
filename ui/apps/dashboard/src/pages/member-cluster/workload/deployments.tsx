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

import { App, Button, Drawer, Input, Select, Space, Table, TableColumnProps } from 'antd';
import { Icons } from '@/components/icons';
import { useMemberClusterContext, useMemberClusterNamespace } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { WorkloadKind } from '@/services/base';
import { useState } from 'react';
import { GetMemberClusterWorkloads, Workload } from '@/services/member-cluster/workload';
import i18nInstance from '@/utils/i18n';
import dayjs from 'dayjs';
import { stringify, parse } from 'yaml';
import Editor from '@monaco-editor/react';
import { GetResource, PutResource } from '@/services/member-cluster/unstructured';
import MemberClusterWorkloadDetailDrawer from './member-cluster-workload-detail-drawer';

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
  const { nsOptions, isNsDataLoading } = useMemberClusterNamespace({ memberClusterName });

  const [viewDrawerState, setViewDrawerState] = useState<{
    open: boolean;
    namespace: string;
    name: string;
    kind: WorkloadKind;
  }>({ open: false, namespace: '', name: '', kind: WorkloadKind.Deployment });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['GetWorkloads', memberClusterName, filter],
    queryFn: async () => {
      const workloads = await GetMemberClusterWorkloads({
        memberClusterName,
        kind: filter.kind,
        namespace: filter.selectedWorkSpace,
        keyword: filter.searchText,
      });
      return workloads.data;
    },
  });

  const columns: TableColumnProps<Workload>[] = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => <>{record.objectMeta.name}</>,
    },
    {
      title: 'Namespace',
      key: 'namespace',
      render: (_, record) => <>{record.objectMeta.namespace}</>,
    },
    {
      title: 'Ready',
      key: 'replicas',
      render: (_, record) => <>{record.pods?.running}/{record.pods?.desired}</>,
    },
    {
      title: 'Images',
      key: 'images',
      render: (_, record) => (
        <code className="text-xs">{record.containerImages?.[0]}</code>
      ),
    },
    {
      title: 'Age',
      key: 'age',
      render: (_, r) => dayjs(r.objectMeta.creationTimestamp).fromNow(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<Icons.eye width={16} height={16} />}
            onClick={() =>
              setViewDrawerState({
                open: true,
                namespace: record.objectMeta.namespace,
                name: record.objectMeta.name,
                kind: record.typeMeta.kind as WorkloadKind,
              })
            }
          >
            View
          </Button>
          <Button
            icon={<Icons.edit width={16} height={16} />}
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
                void messageApi.error(`Failed to load deployment ${String(e)}`);
              }
            }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col p-4">
      <div className="flex flex-row space-x-4 mb-4">
        <h3 className="leading-[32px]">
          {i18nInstance.t('280c56077360c204e536eb770495bc5f', '命名空间')}：
        </h3>
        <Select
          options={nsOptions}
          className="min-w-[200px]"
          value={filter.selectedWorkSpace}
          loading={isNsDataLoading}
          showSearch
          allowClear
          onChange={(v) => setFilter({ ...filter, selectedWorkSpace: v })}
        />
        <Input.Search
          placeholder={i18nInstance.t('cfaff3e369b9bd51504feb59bf0972a0', '按命名空间搜索')}
          className="w-[300px]"
          onPressEnter={(e) =>
            setFilter({ ...filter, searchText: e.currentTarget.value })
          }
        />
      </div>

      <div className="flex-1 flex flex-col">
        <Table
          rowKey={(record) => `${record.objectMeta.namespace}-${record.objectMeta.name}`}
          columns={columns}
          dataSource={data?.deployments || []}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} deployments`,
          }}
          loading={isLoading}
        />
      </div>

      <MemberClusterWorkloadDetailDrawer
        open={viewDrawerState.open}
        memberClusterName={memberClusterName}
        namespace={viewDrawerState.namespace}
        name={viewDrawerState.name}
        kind={viewDrawerState.kind}
        onClose={() => setViewDrawerState((s) => ({ ...s, open: false }))}
      />

      <Drawer
        title="Edit deployment (YAML)"
        placement="right"
        size={900}
        open={editModalOpen}
        onClose={() => { if (!editSubmitting) { setEditModalOpen(false); setEditContent(''); } }}
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
                  const metadata = (yamlObject.metadata || {}) as { name?: string; namespace?: string };
                  await PutResource({
                    memberClusterName,
                    kind,
                    name: metadata.name || '',
                    namespace: metadata.namespace || '',
                    content: yamlObject,
                  });
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
          options={{ lineNumbers: 'on', fontSize: 14, minimap: { enabled: false }, wordWrap: 'on' }}
          onChange={(value) => setEditContent(value || '')}
        />
      </Drawer>
    </div>
  );
}
