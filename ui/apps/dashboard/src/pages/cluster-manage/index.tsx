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
    queryKey: ['ClusterManagePage', 'GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
  });
  const [deletingNames, setDeletingNames] = useState<Set<string>>(new Set());
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
      title: i18nInstance.t('c3f28b34bbdec501802fa403584267e6', '集群名称'),
      key: 'clusterName',
      width: 150,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: i18nInstance.t(
        'bd17297989ec345cbc03ae0b8a13dc0a',
        'kubernetes版本',
      ),
      dataIndex: 'kubernetesVersion',
      key: 'kubernetesVersion',
      width: 150,
      align: 'center',
    },
    {
      title: i18nInstance.t('ee00813361387a116d274c608ba8bb13', '集群状态'),
      dataIndex: 'ready',
      key: 'ready',
      align: 'center',
      width: 150,
      render: (v) => {
        if (v) {
          return (
            <Badge
              color={'green'}
              text={
                <span
                  style={{
                    color: '#52c41a',
                  }}
                >
                  ready
                </span>
              }
            />
          );
        } else {
          return (
            <Badge
              color={'red'}
              text={
                <span
                  style={{
                    color: '#f5222d',
                  }}
                >
                  not ready
                </span>
              }
            />
          );
        }
      },
    },
    {
      title: i18nInstance.t('f0789e79d48f135e5d870753f7a85d05', '模式'),
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
      title: i18nInstance.t('b86224e030e5948f96b70a4c3600b33f', '节点状态'),
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
      title: i18nInstance.t('763a78a5fc84dbca6f0137a591587f5f', 'cpu用量'),
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
      title: i18nInstance.t('8b2e672e8b847415a47cc2dd25a87a07', 'memory用量'),
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
      title: i18nInstance.t('2b6bc0f293f5ca01b006206c2535ccbc', '操作'),
      key: 'op',
      width: 200,
      render: (_, r) => {
        return (
          <Space.Compact>
            <Button size={'small'} type="link" disabled>
              {i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f', '查看')}
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
              {i18nInstance.t('95b351c86267f3aedf89520959bce689', '编辑')}
            </Button>
            <Popconfirm
              placement="topRight"
              title={i18nInstance.t('30ee910e8ea18311b1b2efbea94333b8', {
                name: r.objectMeta.name,
              })}
              onConfirm={async () => {
                const ret = await DeleteCluster(r.objectMeta.name);
                if (ret.code === 200) {
                  await messageApi.success(
                    i18nInstance.t('fb09e53e96ff76a72894a816dd7c731c', {
                      name: r.objectMeta.name,
                    }),
                  );
                  setDeletingNames((prev) => {
                    const next = new Set(prev);
                    next.add(r.objectMeta.name);
                    return next;
                  });
                  await refetch();
                  setDeletingNames((prev) => {
                    const next = new Set(prev);
                    next.delete(r.objectMeta.name);
                    return next;
                  });
                } else {
                  await messageApi.error(
                    i18nInstance.t(
                      '9e7856e9c5938b9200dbdc174e97cf8a',
                      '集群删除失败',
                    ),
                  );
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
  return (
    <Panel>
      <div className={'flex flex-row justify-between mb-4'}>
        <Input.Search
          placeholder={i18nInstance.t(
            'e8d235e76b8e310660e158dc4c2fd560',
            '按集群名称搜索',
          )}
          className={'w-[400px]'}
        />
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
          {i18nInstance.t('4cd980b26c5c76cdd4a5c5e44064d6da', '新增集群')}
        </Button>
      </div>
      <Table
        rowKey={(r: Cluster) => r.objectMeta.name || ''}
        columns={columns}
        loading={isLoading}
        dataSource={(data?.clusters || []).filter(
          (r: Cluster) => !deletingNames.has(r.objectMeta.name),
        )}
      />

      <NewClusterModal
        mode={clusterModalData.mode}
        open={clusterModalData.open}
        onOk={async (ret) => {
          if (ret.code === 200) {
            if (clusterModalData.mode === 'create') {
              await messageApi.success(
                i18nInstance.t(
                  'dca2754f7a646ef40f495f75145428d0',
                  '集群接入成功',
                ),
              );
            } else if (clusterModalData.mode === 'edit') {
              await messageApi.success(
                i18nInstance.t(
                  '474162cdce4e540d3a4d97c6de92cd68',
                  '集群更新成功',
                ),
              );
            }
            await refetch();
            setModalData({
              clusterDetail: undefined,
              mode: 'create',
              open: false,
            });
          } else {
            if (clusterModalData.mode === 'create') {
              await messageApi.error(
                i18nInstance.t(
                  '3b0b5df2e18ef97b7f948c60906a7821',
                  '集群接入失败',
                ),
              );
            } else if (clusterModalData.mode === 'edit') {
              await messageApi.error(
                i18nInstance.t(
                  '01812e386ab69ce4391769918e32d6d1',
                  '集群更新失败',
                ),
              );
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
