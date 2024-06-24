import Panel from '@/components/panel';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Input,
  message,
  Space,
  Table,
  TableColumnProps,
  Tag,
} from 'antd';
import { GetNamespaces } from '@/services/namespace.ts';
import type { Namespace } from '@/services/namespace.ts';
import { Icons } from '@/components/icons';
import dayjs from 'dayjs';
import { useToggle } from '@uidotdev/usehooks';
import NewNamespaceModal from './new-namespace-modal.tsx';
import { DeleteResource } from '@/services/unstructured';

const NamespacePage = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetNamespaces'],
    queryFn: async () => {
      const clusters = await GetNamespaces();
      return clusters.data || {};
    },
  });
  const columns: TableColumnProps<Namespace>[] = [
    {
      title: '命名空间名称',
      key: 'namespaceName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: '标签',
      key: 'label',
      align: 'left',
      render: (_, r) => {
        if (!r?.objectMeta?.labels) {
          return '-';
        }
        return (
          <div>
            {Object.keys(r.objectMeta.labels).map((key) => (
              <Tag key={`${r.objectMeta.name}-${key}`}>
                {key}:{r.objectMeta.labels[key]}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: '是否跳过自动调度',
      key: 'skipAutoPropagation',
      render: (_, r) => {
        return r.skipAutoPropagation ? (
          <Tag color="blue">yes</Tag>
        ) : (
          <Tag color="purple">no</Tag>
        );
      },
    },
    {
      title: '运行状态',
      key: 'phase',
      dataIndex: 'phase',
    },
    {
      title: '创建时间',
      key: 'creationTimestamp',
      render: (_, r) => {
        return dayjs(r.objectMeta.creationTimestamp).format(
          'YYYY/MM/DD HH:mm:ss',
        );
      },
    },
    {
      title: '操作',
      key: 'op',
      width: 200,
      render: (_, r) => {
        return (
          <Space.Compact>
            <Button size={'small'} type="link">
              查看
            </Button>
            <Button size={'small'} type="link">
              编辑
            </Button>
            <Button
              size={'small'}
              type="link"
              danger
              onClick={async () => {
                const ret = await DeleteResource({
                  kind: 'namespace',
                  name: r.objectMeta.name,
                });
                if (ret.code === 200) {
                  messageApi.error('删除命名空间成功');
                  await refetch();
                } else {
                  messageApi.error('删除命名空间失败');
                }
              }}
            >
              删除
            </Button>
          </Space.Compact>
        );
      },
    },
  ];
  const [showModal, toggleShowModal] = useToggle(false);
  const [messageApi, messageContextHolder] = message.useMessage();
  return (
    <Panel>
      <div className={'flex flex-row justify-between mb-4'}>
        <Input.Search placeholder={'按命名空间搜索'} className={'w-[400px]'} />
        <Button
          type={'primary'}
          icon={<Icons.add width={16} height={16} />}
          className="flex flex-row items-center"
          onClick={() => {
            toggleShowModal(true);
          }}
        >
          新增命名空间
        </Button>
      </div>
      <Table
        rowKey={(r: Namespace) => r.objectMeta.name || ''}
        columns={columns}
        loading={isLoading}
        dataSource={data?.namespaces || []}
      />
      <NewNamespaceModal
        open={showModal}
        onOk={async (ret) => {
          if (ret.code === 200) {
            messageApi.success('创建命名空间成功');
            toggleShowModal(false);
            await refetch();
          } else {
            messageApi.error('创建命名空间失败');
          }
        }}
        onCancel={async () => {
          toggleShowModal(false);
        }}
      />
      {messageContextHolder}
    </Panel>
  );
};

export default NamespacePage;
