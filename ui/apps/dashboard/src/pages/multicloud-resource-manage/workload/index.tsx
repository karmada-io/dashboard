import Panel from '@/components/panel';
import {
  Button,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  TableColumnProps,
  Tag,
} from 'antd';
import { Icons } from '@/components/icons';
import { GetNamespaces } from '@/services/namespace';
import { GetWorkloads } from '@/services/workload';
import type { DeploymentWorkload } from '@/services/workload';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { DeleteResource, GetResource } from '@/services/unstructured.ts';
import NewWorkloadEditorModal from './new-workload-editor-modal.tsx';
import WorkloadDetailDrawer, {
  WorkloadDetailDrawerProps,
} from './workload-detail-drawer.tsx';
import { useToggle } from '@uidotdev/usehooks';
import { stringify } from 'yaml';

/*
propagationpolicy.karmada.io/name: "nginx-propagation"
propagationpolicy.karmada.io/namespace: "default"
*/
const propagationpolicyKey = 'propagationpolicy.karmada.io/name';
const WorkloadPage = () => {
  const { data: nsData } = useQuery({
    queryKey: ['GetNamespaces'],
    queryFn: async () => {
      const clusters = await GetNamespaces();
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
    queryKey: ['GetWorkloads'],
    queryFn: async () => {
      const clusters = await GetWorkloads({});
      return clusters.data || {};
    },
  });
  const [drawerData, setDrawerData] = useState<
    Omit<WorkloadDetailDrawerProps, 'onClose'>
  >({
    open: false,
    kind: '',
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
  }, [editorState]);
  const columns: TableColumnProps<DeploymentWorkload>[] = [
    {
      title: '命名空间',
      key: 'namespaceName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.namespace;
      },
    },
    {
      title: '负载名称',
      key: 'workloadName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: '标签信息',
      key: 'labelName',
      align: 'left',
      width: '30%',
      render: (_, r) => {
        if (!r?.objectMeta?.labels) {
          return '-';
        }
        return (
          <div className="flex flex-wrap">
            {Object.keys(r.objectMeta.labels).map((key) => (
              <Tag className={'mb-2'} key={`${r.objectMeta.name}-${key}`}>
                {key}:{r.objectMeta.labels[key]}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: '分发策略',
      key: 'propagationPolicies',
      render: (_, r) => {
        if (!r?.objectMeta?.annotations?.[propagationpolicyKey]) {
          return '-';
        }
        return <Tag>{r?.objectMeta?.annotations?.[propagationpolicyKey]}</Tag>;
      },
    },
    {
      title: '覆盖策略',
      key: 'overridePolicies',
      width: 150,
      render: () => {
        return '-';
      },
    },
    {
      title: '操作',
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
                  kind: r.typeMeta.kind,
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                });
              }}
            >
              查看
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
              编辑
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
                } else {
                }
              }}
              okText="确认"
              cancelText="取消"
            >
              <Button size={'small'} type="link" danger>
                删除
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
        <div className={'flex flex-row justify-center space-x-4'}>
          <h3 className={'leading-[32px]'}>命名空间：</h3>
          <Select options={nsOptions} className={'w-[200px]'} />
          <Input.Search
            placeholder={'按命名空间搜索'}
            className={'w-[300px]'}
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
          新增工作负载
        </Button>
      </div>
      <Table
        rowKey={(r: DeploymentWorkload) => r.objectMeta.name || ''}
        columns={columns}
        loading={isLoading}
        dataSource={data?.deployments || []}
      />
      <NewWorkloadEditorModal
        mode={editorState.mode}
        workloadContent={editorState.content}
        open={showModal}
        onOk={async (ret) => {
          const msg = editorState.mode === 'edit' ? '修改' : '新增';
          if (ret.code === 200) {
            messageApi.success(`工作负载${msg}成功`);
            toggleShowModal(false);
            resetEditorState();
            await refetch();
          } else {
            messageApi.error(`工作负载${msg}失败`);
          }
        }}
        onCancel={async () => {
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
            kind: '',
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
