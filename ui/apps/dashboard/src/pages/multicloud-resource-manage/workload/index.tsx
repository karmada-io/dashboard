import i18nInstance from '@/utils/i18n';
import Panel from '@/components/panel';
import {
  Button,
  Input,
  message,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  TableColumnProps,
  Tag,
} from 'antd';
import { Icons } from '@/components/icons';
import { GetNamespaces } from '@/services/namespace';
import type { DeploymentWorkload } from '@/services/workload';
import { GetWorkloads } from '@/services/workload';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { DeleteResource, GetResource } from '@/services/unstructured.ts';
import NewWorkloadEditorModal from './new-workload-editor-modal.tsx';
import WorkloadDetailDrawer, {
  WorkloadDetailDrawerProps,
} from './workload-detail-drawer.tsx';
import { useToggle, useWindowSize } from '@uidotdev/usehooks';
import { stringify } from 'yaml';
import TagList from '@/components/tag-list';
import { WorkloadKind } from '@/services/base.ts';

/*
propagationpolicy.karmada.io/name: "nginx-propagation"
propagationpolicy.karmada.io/namespace: "default"
*/

const propagationpolicyKey = 'propagationpolicy.karmada.io/name';
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
  const { data: nsData, isLoading: isNsDataLoading } = useQuery({
    queryKey: ['GetNamespaces'],
    queryFn: async () => {
      const clusters = await GetNamespaces({});
      return clusters.data || {};
    },
  });
  const nsOptions = useMemo(() => {
    if (!nsData?.namespaces) return [];
    return nsData.namespaces.map((item) => {
      return {
        title: item.objectMeta.name,
        value: item.objectMeta.name,
      };
    });
  }, [nsData]);
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
      title: i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298'),
      key: 'namespaceName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.namespace;
      },
    },
    {
      title: i18nInstance.t('89d19c60880d35c2bd88af0d9cc0497b'),
      key: 'workloadName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: i18nInstance.t('1f7be0a924280cd098db93c9d81ecccd'),
      key: 'labelName',
      align: 'left',
      width: '30%',
      render: (_, r) => {
        if (!r?.objectMeta?.labels) {
          return '-';
        }
        const params = Object.keys(r.objectMeta.labels).map((key) => {
          return {
            key: `${r.objectMeta.name}-${key}`,
            value: `${key}:${r.objectMeta.labels[key]}`,
          };
        });
        return (
          <TagList
            tags={params}
            maxLen={size && size.width! > 1800 ? undefined : 1}
          />
        );
      },
    },
    {
      title: i18nInstance.t('8a99082b2c32c843d2241e0ba60a3619'),
      key: 'propagationPolicies',
      render: (_, r) => {
        if (!r?.objectMeta?.annotations?.[propagationpolicyKey]) {
          return '-';
        }
        return <Tag>{r?.objectMeta?.annotations?.[propagationpolicyKey]}</Tag>;
      },
    },
    {
      title: i18nInstance.t('eaf8a02d1b16fcf94302927094af921f'),
      key: 'overridePolicies',
      width: 150,
      render: () => {
        return '-';
      },
    },
    {
      title: i18nInstance.t('2b6bc0f293f5ca01b006206c2535ccbc'),
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
              {i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f')}
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
              {i18nInstance.t('95b351c86267f3aedf89520959bce689')}
            </Button>

            <Popconfirm
              placement="topRight"
              title={`确认要删除${r.objectMeta.name}工作负载么`}
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
              okText={i18nInstance.t('e83a256e4f5bb4ff8b3d804b5473217a')}
              cancelText={i18nInstance.t('625fb26b4b3340f7872b411f401e754c')}
            >
              <Button size={'small'} type="link" danger>
                {i18nInstance.t('2f4aaddde33c9b93c36fd2503f3d122b')}
              </Button>
            </Popconfirm>
          </Space.Compact>
        );
      },
    },
  ];

  const [messageApi, messageContextHolder] = message.useMessage();

  return (
    <Panel>
      <div className={'flex flex-row justify-between mb-4'}>
        <div>
          <Segmented
            value={filter.kind}
            style={{ marginBottom: 8 }}
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
                value: 'deployment',
              },
              {
                label: 'Statefulset',
                value: 'statefulset',
              },
            ]}
          />
        </div>
        <Button
          type={'primary'}
          icon={<Icons.add width={16} height={16} />}
          className="flex flex-row items-center"
          onClick={() => {
            toggleShowModal(true);
          }}
        >
          {i18nInstance.t('96d6b0fcc58b6f65dc4c00c6138d2ac0')}
        </Button>
      </div>
      <div className={'flex flex-row space-x-4 mb-4'}>
        <h3 className={'leading-[32px]'}>
          {i18nInstance.t('280c56077360c204e536eb770495bc5f')}
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
          placeholder={i18nInstance.t('cfaff3e369b9bd51504feb59bf0972a0')}
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
      <Table
        rowKey={(r: DeploymentWorkload) => r.objectMeta.name || ''}
        columns={columns}
        loading={isLoading}
        dataSource={data ? data.deployments || data.statefulSets : []}
      />

      <NewWorkloadEditorModal
        mode={editorState.mode}
        workloadContent={editorState.content}
        open={showModal}
        onOk={async (ret) => {
          const msg =
            editorState.mode === 'edit'
              ? i18nInstance.t('8347a927c09a4ec2fe473b0a93f667d0')
              : i18nInstance.t('66ab5e9f24c8f46012a25c89919fb191');
          if (ret.code === 200) {
            await messageApi.success(`工作负载${msg}成功`);
            toggleShowModal(false);
            resetEditorState();
            await refetch();
          } else {
            await messageApi.error(`工作负载${msg}失败`);
          }
        }}
        onCancel={() => {
          resetEditorState();
          toggleShowModal(false);
        }}
      />

      <WorkloadDetailDrawer
        open={drawerData.open}
        kind={drawerData.kind}
        name={drawerData.name}
        namespace={drawerData.namespace}
        onClose={() => {
          setDrawerData({
            open: false,
            kind: WorkloadKind.Unknown,
            namespace: '',
            name: '',
          });
        }}
      />

      {messageContextHolder}
    </Panel>
  );
};

export default WorkloadPage;
