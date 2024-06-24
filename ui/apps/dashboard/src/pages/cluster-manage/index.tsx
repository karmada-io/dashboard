import Panel from '@/components/panel';
import { useQuery } from '@tanstack/react-query';
import { GetClusters } from '@/services';
import {
  Cluster,
  ClusterDetail,
  DeleteCluster,
  GetClusterDetail,
} from '@/services/cluster';
import {
  Badge,
  Tag,
  Table,
  TableColumnProps,
  Progress,
  Space,
  Button,
  Input,
  message,
  Popconfirm,
} from 'antd';
import { Icons } from '@/components/icons';
import NewClusterModal from './new-cluster-modal';
import { useState } from 'react';

function getPercentColor(v: number): string {
  // 0~60 #52C41A
  // 60~80 #FAAD14
  // > 80 #F5222D
  if (v <= 60) {
    return '#52C41A';
  } else if (v <= 80) {
    return '#FAAD14';
  } else {
    return '#F5222D';
  }
}

const ClusterManagePage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
  });
  const [clusterModalData, setModalData] = useState<{
    mode: 'create' | 'edit';
    open: boolean;
    clusterDetail?: ClusterDetail;
  }>({
    mode: 'create',
    open: false,
  });
  const columns: TableColumnProps<Cluster>[] = [
    {
      title: '集群名称',
      key: 'clusterName',
      width: 150,
      render: (_, r) => {
        r.ready;
        return r.objectMeta.name;
      },
    },
    {
      title: 'kubernetes版本',
      dataIndex: 'kubernetesVersion',
      key: 'kubernetesVersion',
      width: 150,
      align: 'center',
    },
    {
      title: '集群状态',
      dataIndex: 'ready',
      key: 'ready',
      align: 'center',
      width: 150,
      render: (v) => {
        if (v) {
          return (
            <Badge
              color={'green'}
              text={<span style={{ color: '#52c41a' }}>ready</span>}
            />
          );
        } else {
          return (
            <Badge
              color={'red'}
              text={<span style={{ color: '#f5222d' }}>not ready</span>}
            />
          );
        }
      },
    },
    {
      title: '模式',
      dataIndex: 'syncMode',
      width: 150,
      align: 'center',
      render: (v) => {
        if (v === 'Push') {
          return <Tag color={'gold'}>{v}</Tag>;
        } else {
          return <Tag color={'blue'}>{v}</Tag>;
        }
      },
    },
    {
      title: '节点状态',
      dataIndex: 'nodeStatus',
      align: 'center',
      width: 150,
      render: (_, r) => {
        if (r.nodeSummary) {
          const { totalNum, readyNum } = r.nodeSummary;
          return (
            <>
              {readyNum}/{totalNum}
            </>
          );
        }
        return '-';
      },
    },
    {
      title: 'cpu用量',
      dataIndex: 'cpuFraction',
      width: '15%',
      render: (_, r) => {
        const fraction = parseFloat(
          r.allocatedResources.cpuFraction.toFixed(2),
        );
        return (
          <Progress
            percent={fraction}
            strokeColor={getPercentColor(fraction)}
          />
        );
      },
    },
    {
      title: 'memory用量',
      dataIndex: 'memoryFraction',
      width: '15%',
      render: (_, r) => {
        const fraction = parseFloat(
          r.allocatedResources.memoryFraction.toFixed(2),
        );
        return (
          <Progress
            percent={fraction}
            strokeColor={getPercentColor(fraction)}
          />
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
            <Button size={'small'} type="link" disabled>
              查看
            </Button>
            <Button
              size={'small'}
              type="link"
              onClick={async () => {
                const ret = await GetClusterDetail(r.objectMeta.name);
                setModalData({
                  open: true,
                  mode: 'edit',
                  clusterDetail: ret.data,
                });
              }}
            >
              编辑
            </Button>
            <Popconfirm
              placement="topRight"
              title={`确认要删除${r.objectMeta.name}集群么?`}
              onConfirm={async () => {
                const ret = await DeleteCluster(r.objectMeta.name);
                if (ret.code === 200) {
                  messageApi.success(`集群${r.objectMeta.name}删除成功`);
                  refetch();
                } else {
                  messageApi.error('集群删除失败');
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
  return (
    <Panel>
      <div className={'flex flex-row justify-between mb-4'}>
        <Input.Search placeholder={'按集群名称搜索'} className={'w-[400px]'} />
        <Button
          type={'primary'}
          icon={<Icons.add width={16} height={16} />}
          className="flex flex-row items-center"
          onClick={() => {
            setModalData({
              mode: 'create',
              open: true,
            });
          }}
        >
          新增集群
        </Button>
      </div>
      <Table
        rowKey={(r: Cluster) => r.objectMeta.name || ''}
        columns={columns}
        loading={isLoading}
        dataSource={data?.clusters || []}
      />
      <NewClusterModal
        mode={clusterModalData.mode}
        open={clusterModalData.open}
        onOk={(ret) => {
          if (ret.code === 200) {
            if (clusterModalData.mode === 'create') {
              messageApi.success('集群接入成功');
            } else if (clusterModalData.mode === 'edit') {
              messageApi.success('集群更新成功');
            }
            refetch();
            setModalData({
              clusterDetail: undefined,
              mode: 'create',
              open: false,
            });
          } else {
            if (clusterModalData.mode === 'create') {
              messageApi.error('集群接入失败');
            } else if (clusterModalData.mode === 'edit') {
              messageApi.error('集群更新失败');
            }
          }
        }}
        onCancel={() => {
          setModalData({
            clusterDetail: undefined,
            mode: 'create',
            open: false,
          });
        }}
        clusterDetail={clusterModalData.clusterDetail}
      />
      {messageContextHolder}
    </Panel>
  );
};

export default ClusterManagePage;
