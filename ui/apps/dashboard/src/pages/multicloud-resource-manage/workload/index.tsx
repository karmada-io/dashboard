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

import i18nInstance from '@/utils/i18n';
import Panel from '@/components/panel';
import {
  App,
  Button,
  Input,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  TableColumnProps,
  Tag,
  Alert,
} from 'antd';
import { Icons } from '@/components/icons';
import type { DeploymentWorkload } from '@/services/workload';
import { GetWorkloads } from '@/services/workload';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DeleteResource, GetResource } from '@/services/unstructured.ts';
import NewWorkloadEditorModal from './new-workload-editor-modal.tsx';
import NewWorkloadWizardModal from './new-workload-wizard-modal/index.tsx';
import WorkloadDetailDrawer, {
  WorkloadDetailDrawerProps,
} from './workload-detail-drawer.tsx';
import { useToggle, useWindowSize } from '@uidotdev/usehooks';
import { stringify } from 'yaml';
import TagList, { convertLabelToTags } from '@/components/tag-list';
import { WorkloadKind } from '@/services/base.ts';
import useNamespace from '@/hooks/use-namespace.ts';

const propagationpolicyKey = 'propagationpolicy.karmada.io/name';
const workloadKindDescriptions: Record<string, string> = {
  deployment: 'Deployment 适用于无状态应用的自动化部署和弹性伸缩，支持滚动升级和回滚。',
  statefulset: 'StatefulSet 适用于有状态服务，支持有序部署、稳定网络标识和持久化存储。',
  daemonset: 'DaemonSet 确保每个节点上都运行一个 Pod，常用于日志、监控等场景。',
  cronjob: 'CronJob 用于定时任务，按计划周期性地运行 Job。',
  job: 'Job 用于一次性任务，确保任务完成指定次数后自动结束。',
};
const WorkloadPage = () => {
  const [filter, setFilter] = useState<{
    kind: WorkloadKind;
    selectedWorkSpace: string;
    searchText: string;
  }>({
    kind: WorkloadKind.Deployment,
    selectedWorkSpace: '',
    searchText: '',
  });

  const { nsOptions, isNsDataLoading } = useNamespace({});
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetWorkloads', JSON.stringify(filter)],
    queryFn: async () => {
      const clusters = await GetWorkloads({
        kind: filter.kind,
        namespace: filter.selectedWorkSpace,
        keyword: filter.searchText,
      });
      return clusters.data || {};
    },
  });
  const [drawerData, setDrawerData] = useState<
    Omit<WorkloadDetailDrawerProps, 'onClose'>
  >({
    open: false,
    kind: WorkloadKind.Unknown,
    namespace: '',
    name: '',
  });
  const [showModal, toggleShowModal] = useToggle(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  // 创建模式选择 - 向导模式或YAML模式
  const [useWizard, setUseWizard] = useState(true);
  const [editorState, setEditorState] = useState<{
    mode: 'create' | 'edit';
    content: string;
  }>({
    mode: 'create',
    content: '',
  });
  const resetEditorState = useCallback(() => {
    setEditorState({
      mode: 'create',
      content: '',
    });
  }, []);
  const size = useWindowSize();
  const columns: TableColumnProps<DeploymentWorkload>[] = [
    {
      title: i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298', '命名空间'),
      key: 'namespaceName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.namespace;
      },
    },
    {
      title: i18nInstance.t('89d19c60880d35c2bd88af0d9cc0497b', '负载名称'),
      key: 'workloadName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: i18nInstance.t('1f7be0a924280cd098db93c9d81ecccd', '标签信息'),
      key: 'labelName',
      align: 'left',
      width: '30%',
      render: (_, r) => (
        <TagList
          tags={convertLabelToTags(r?.objectMeta?.name, r?.objectMeta?.labels)}
          maxLen={size && size.width! > 1800 ? undefined : 1}
        />
      ),
    },
    {
      title: i18nInstance.t('期望Pod副本数量', '应用服务Pod部署数量'),
      key: 'desiredReplicas',
      width: 150,
      render: (_, r) => {
        return r.pods?.desired || '-';
      },
    },
    {
      title: i18nInstance.t('8a99082b2c32c843d2241e0ba60a3619', '分发策略'),
      key: 'propagationPolicies',
      render: (_, r) => {
        if (!r?.objectMeta?.annotations?.[propagationpolicyKey]) {
          return '-';
        }
        return <Tag>{r?.objectMeta?.annotations?.[propagationpolicyKey]}</Tag>;
      },
    },
    {
      title: i18nInstance.t('eaf8a02d1b16fcf94302927094af921f', '覆盖策略'),
      key: 'overridePolicies',
      width: 150,
      render: () => {
        return '-';
      },
    },
    {
      title: i18nInstance.t('2b6bc0f293f5ca01b006206c2535ccbc', '操作'),
      key: 'op',
      width: 200,
      render: (_, r) => {
        return (
          <Space.Compact>
            <Button
              size={'small'}
              type="link"
              onClick={() => {
                setDrawerData({
                  open: true,
                  kind: r.typeMeta.kind as WorkloadKind,
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                });
              }}
            >
              {i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f', '查看')}
            </Button>
            <Button
              size={'small'}
              type="link"
              onClick={async () => {
                const ret = await GetResource({
                  kind: r.typeMeta.kind,
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                });
                setEditorState({
                  mode: 'edit',
                  content: stringify(ret.data),
                });
                toggleShowModal(true);
              }}
            >
              {i18nInstance.t('95b351c86267f3aedf89520959bce689', '编辑')}
            </Button>

            <Popconfirm
              placement="topRight"
              title={i18nInstance.t('f0ade52acfa0bc5bd63e7cb29db84959', {
                name: r.objectMeta.name,
              })}
              onConfirm={async () => {
                // todo after delete, need to wait until resource deleted
                const ret = await DeleteResource({
                  kind: r.typeMeta.kind,
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                });
                if (ret.code === 200) {
                  await refetch();
                }
              }}
              okText={i18nInstance.t(
                'e83a256e4f5bb4ff8b3d804b5473217a',
                '确认',
              )}
              cancelText={i18nInstance.t(
                '625fb26b4b3340f7872b411f401e754c',
                '取消',
              )}
            >
              <Button size={'small'} type="link" danger>
                {i18nInstance.t('2f4aaddde33c9b93c36fd2503f3d122b', '删除')}
              </Button>
            </Popconfirm>
          </Space.Compact>
        );
      },
    },
  ];
  const { message: messageApi } = App.useApp();

  // 处理工作负载创建按钮点击
  const handleAddWorkload = () => {
    if (useWizard) {
      // 使用向导模式
      setShowWizardModal(true);
    } else {
      // 使用YAML编辑器模式
      setEditorState({
        mode: 'create',
        content: '',
      });
      toggleShowModal(true);
    }
  };

  // 刷新工作负载列表
  const refreshWorkloadList = async () => {
    await refetch();
  };

  // 处理从API响应中提取工作负载列表
  const getWorkloadItems = () => {
    if (!data) return [];
    
    // 根据工作负载类型提取对应的数据
    switch(filter.kind) {
      case WorkloadKind.Deployment:
        return data.deployments || [];
      case WorkloadKind.Statefulset:
        return data.statefulSets || [];
      case WorkloadKind.Daemonset:
        return data.daemonSets || [];
      case WorkloadKind.Job:
      case WorkloadKind.Cronjob:
        return data.jobs || [];
      default:
        return data.items || [];
    }
  };

  return (
    <Panel>
      <Alert message="工作负载用于统一管理和调度多集群中的 Deployment、StatefulSet、DaemonSet 等工作负载。" type="info" showIcon style={{ marginBottom: 16 }} />
      <div className={'flex flex-row justify-between mb-4'}>
        <div>
          <Segmented
            value={filter.kind}
            style={{
              marginBottom: 8,
            }}
            onChange={(value) => {
              // reset filter when switch workload kind
              const k = value as WorkloadKind;
              if (k !== filter.kind) {
                setFilter({
                  ...filter,
                  kind: value as WorkloadKind,
                  selectedWorkSpace: '',
                  searchText: '',
                });
              } else {
                setFilter({
                  ...filter,
                  kind: value as WorkloadKind,
                });
              }
            }}
            options={[
              {
                label: 'Deployment',
                value: WorkloadKind.Deployment,
              },
              {
                label: 'StatefulSet',
                value: WorkloadKind.Statefulset,
              },
              {
                label: 'DaemonSet',
                value: WorkloadKind.Daemonset,
              },
              {
                label: 'CronJob',
                value: WorkloadKind.Cronjob,
              },
              {
                label: 'Job',
                value: WorkloadKind.Job,
              },
            ]}
          />
        </div>
        <div className="flex space-x-2">
          <Select
            options={[
              { label: '使用向导创建', value: true },
              { label: '使用YAML创建', value: false }
            ]}
            value={useWizard}
            style={{ width: 140 }}
            onChange={(value) => setUseWizard(value)}
          />
          <Button
            type="primary"
            className={'flex flex-row items-center'}
            icon={<Icons.add width={16} height={16} />}
            onClick={handleAddWorkload}
          >
            {i18nInstance.t('新增工作负载', '新增工作负载')}
          </Button>
        </div>
      </div>
      <div style={{ marginBottom: 16, fontSize: 15, color: '#555' }}>
        {workloadKindDescriptions[String(filter.kind).toLowerCase()]}
      </div>
      <div className={'flex flex-row space-x-4 mb-4'}>
        <h3 className={'leading-[32px]'}>
          {i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298', '命名空间')}
        </h3>
        <Select
          options={nsOptions}
          className={'min-w-[200px]'}
          loading={isNsDataLoading}
          allowClear
          showSearch
          value={filter.selectedWorkSpace}
          onChange={(v) => {
            setFilter({
              ...filter,
              selectedWorkSpace: v,
            });
          }}
        />
        <Input.Search
          onPressEnter={(e) => {
            const input = e.currentTarget.value;
            setFilter({
              ...filter,
              searchText: input,
            });
          }}
          placeholder={i18nInstance.t(
            'cfaff3e369b9bd51504feb59bf0972a0',
            '按命名空间搜索',
          )}
          className={'w-[300px]'}
        />
      </div>
      <Table
        columns={columns}
        rowKey={(record) =>
          `${record.typeMeta.kind}.${record.objectMeta.namespace}.${record.objectMeta.name}`
        }
        loading={isLoading}
        dataSource={getWorkloadItems()}
        pagination={{
          current: 1,
          defaultPageSize: 10,
          total: data?.listMeta?.totalItems || 0,
          showSizeChanger: true,
        }}
      />
      <WorkloadDetailDrawer
        {...drawerData}
        onClose={() => {
          setDrawerData({
            ...drawerData,
            open: false,
          });
        }}
      />
      {/* YAML编辑器模态框 */}
      <NewWorkloadEditorModal
        mode={editorState.mode}
        workloadContent={editorState.content}
        open={showModal}
        onOk={async (ret) => {
          if (ret.code === 200) {
            await messageApi.success(
              editorState.mode === 'edit'
                ? i18nInstance.t('55aa6366c0d09a392d8acf54c4c4b837', '更新成功')
                : i18nInstance.t('04a691b377c91da599d5b4b62b0cb114', '创建成功'),
            );
            toggleShowModal(false);
            resetEditorState();
            // invalidate react query
            await refreshWorkloadList();
          }
        }}
        onCancel={() => {
          toggleShowModal(false);
          resetEditorState();
        }}
        kind={filter.kind}
      />
      {/* 工作负载向导模态框 */}
      <NewWorkloadWizardModal
        open={showWizardModal}
        onCancel={() => setShowWizardModal(false)}
        onOk={async () => {
          await messageApi.success(i18nInstance.t('创建成功', '创建成功'));
          await refreshWorkloadList();
        }}
        kind={filter.kind}
      />
    </Panel>
  );
};
export default WorkloadPage;
