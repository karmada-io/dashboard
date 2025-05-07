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
import { Badge, Card, Col, Descriptions, DescriptionsProps, Progress, Row, Spin, Statistic, Tag, Table, Tooltip, Space, Typography, Avatar, Empty, Button, Divider } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetClusters } from '@/services';
import { GetOverview, GetNodeSummary, GetPodSummary } from '@/services/overview.ts';
import { Cluster } from '@/services/cluster';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Icons } from '@/components/icons';
import { Pie, Column, Line } from '@ant-design/charts';
import { CheckCircleFilled, CloseCircleFilled, InfoCircleFilled, QuestionCircleFilled, WarningFilled } from '@ant-design/icons';
import { useMemo } from 'react';

const { Title, Text } = Typography;

const getPercentColor = (v: number): string => {
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
};

// 添加完整的类型定义
interface OverviewInfo {
  karmadaInfo: {
    version: {
      gitVersion: string;
    };
    status: string;
    createTime: string;
  };
  memberClusterStatus: {
    nodeSummary: {
      totalNum: number;
      readyNum: number;
    };
    cpuSummary: {
      totalCPU: number;
      allocatedCPU: number;
    };
    memorySummary: {
      totalMemory: number;
      allocatedMemory: number;
    };
    podSummary: {
      totalPod: number;
      allocatedPod: number;
    };
  };
  clusterResourceStatus: {
    propagationPolicyNum: number;
    overridePolicyNum: number;
    namespaceNum: number;
    workloadNum: number;
    serviceNum: number;
    configNum: number;
  };
}

// 定义资源汇总数据类型
interface ResourcesSummary {
  node: {
    total: number;
    ready: number;
  };
  pod: {
    capacity: number;
    allocated: number;
  };
  cpu: {
    capacity: number;
    usage: number;
  };
  memory: {
    capacity: number;
    usage: number;
  };
}

const Overview = () => {
  const { clusterName } = useParams<{ clusterName: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['GetOverview'],
    queryFn: async () => {
      const ret = await GetOverview();
      return ret.data as OverviewInfo;
    },
  });

  // 获取资源汇总数据
  const { data: resourcesData, isLoading: isResourcesLoading } = useQuery({
    queryKey: ['GetResourcesSummary'],
    queryFn: async () => {
      const res = await fetch('/api/v1/overview/resources');
      if (!res.ok) {
        throw new Error('Failed to fetch resources summary');
      }
      const data = await res.json();
      return data.data as ResourcesSummary;
    },
    // 仅在全局概览页面时获取
    enabled: !clusterName
  });

  // 获取节点汇总数据
  const { data: nodeData, isLoading: isNodeLoading } = useQuery({
    queryKey: ['GetNodeSummary'],
    queryFn: async () => {
      const ret = await GetNodeSummary();
      return ret.data;
    },
    // 仅在全局概览页面时获取
    enabled: !clusterName
  });

  // 获取Pod汇总数据
  const { data: podData, isLoading: isPodLoading } = useQuery({
    queryKey: ['GetPodSummary'],
    queryFn: async () => {
      const ret = await GetPodSummary();
      return ret.data;
    },
    // 仅在全局概览页面时获取
    enabled: !clusterName
  });

  const { data: clusterData, isLoading: isClusterLoading } = useQuery({
    queryKey: ['GetClusters', clusterName],
    queryFn: async () => {
      const ret = await GetClusters();
      if (clusterName && ret.data?.clusters) {
        const filteredClusters = ret.data.clusters.filter(
          (cluster) => cluster.objectMeta.name === clusterName
        );
        if (filteredClusters.length > 0) {
            return { ...ret.data, clusters: filteredClusters };
        }
        return { ...ret.data, clusters: [] }; 
      }
      return ret.data;
    },
  });

  const basicItems: DescriptionsProps['items'] = [
    {
      key: 'karmada-version',
      label: i18nInstance.t('66e8579fa53a0cdf402e882a3574a380', 'Karmada版本'),
      children: data?.karmadaInfo.version.gitVersion || '-',
    },
    {
      key: 'karmada-status',
      label: i18nInstance.t('3fea7ca76cdece641436d7ab0d02ab1b', '状态'),
      children:
        data?.karmadaInfo.status === 'running' ? (
          <Badge
            color={'green'}
            text={i18nInstance.t('d679aea3aae1201e38c4baaaeef86efe', '运行中')}
          />
        ) : (
          <Badge
            color={'red'}
            text={i18nInstance.t(
              '903b25f64e1c0d9b7f56ed80c256a2e7',
              '未知状态',
            )}
          />
        ),
    },
    {
      key: 'karmada-create-time',
      label: i18nInstance.t('eca37cb0726c51702f70c486c1c38cf3', '创建时间'),
      children:
        (data?.karmadaInfo.createTime &&
          dayjs(data?.karmadaInfo.createTime).format('YYYY-MM-DD HH:mm:ss')) ||
        '-',
    },
  ];

  const resourceItems: DescriptionsProps['items'] = [
    {
      key: 'policy-info',
      label: i18nInstance.t('85c6051762df2fe8f93ebc1083b7f6a4', '策略信息'),
      children: (
        <div className="flex flex-row space-x-4">
          <Statistic
            title={i18nInstance.t(
              'a95abe7b8eeb55427547e764bf39f1c4',
              '调度策略',
            )}
            value={data?.clusterResourceStatus.propagationPolicyNum}
          />

          <Statistic
            title={i18nInstance.t(
              '0a7e9443c41575378d2db1e288d3f1cb',
              '差异化策略',
            )}
            value={data?.clusterResourceStatus.overridePolicyNum}
          />
        </div>
      ),

      span: 3,
    },
    {
      key: 'resource-info',
      label: i18nInstance.t('1f3ad14abef7d52e60324c174da27ca2', '资源信息'),
      children: (
        <div className="flex flex-row space-x-4">
          <Statistic
            title={i18nInstance.t(
              '06ff2e9eba7ae422587c6536e337395f',
              '命名空间',
            )}
            value={data?.clusterResourceStatus.namespaceNum}
          />

          <Statistic
            title={i18nInstance.t(
              '1e02cae704efe124f1a6f1f8b112fd52',
              '工作负载',
            )}
            value={data?.clusterResourceStatus.workloadNum}
          />

          <Statistic
            title={i18nInstance.t(
              '61d4e9d7e94ce41f7697aab2bbe1ae4e',
              '服务与路由',
            )}
            value={data?.clusterResourceStatus.serviceNum}
          />

          <Statistic
            title={i18nInstance.t(
              '9f1f65c8c39bb0afe83f8f1d6e93bfe4',
              '配置与存储'
            )}
            value={data?.clusterResourceStatus?.configNum}
            valueStyle={{ color: '#52c41a' }}
          />
        </div>
      ),
      span: 3,
    },
  ];

  // 最近表格数据
  const recentClusterEvents = useMemo(() => {
    if (!clusterData?.clusters?.length) return [];
    
    return clusterData.clusters.slice(0, 4).map((cluster, index) => ({
      key: index.toString(),
      name: cluster.objectMeta.name,
      action: cluster.ready ? '集群就绪' : '集群未就绪',
      status: cluster.ready ? 'success' : 'error',
      time: dayjs(cluster.objectMeta.creationTimestamp).format('YYYY-MM-DD HH:mm:ss'),
    }));
  }, [clusterData]);

  const columns = [
    {
      title: '集群名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <a onClick={() => navigate(`/cluster-manage/${text}/overview`)}>{text}</a>,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'success' | 'processing' | 'warning' | 'error') => {
        const statusMap: Record<string, React.ReactNode> = {
          success: <Badge status="success" text="成功" />,
          processing: <Badge status="processing" text="处理中" />,
          warning: <Badge status="warning" text="警告" />,
          error: <Badge status="error" text="失败" />,
        };
        return statusMap[status];
      },
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
    },
  ];

  const pieConfig = {
    appendPadding: 10,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}',
    },
    interactions: [{ type: 'element-active' }],
    legend: { position: 'bottom' },
  };

  // 修改renderStatisticCards函数，使用新的节点和Pod数据
  const renderStatisticCards = () => {
    if (!resourcesData) {
      return <Empty description={i18nInstance.t('6f21c1bfa15eb362a82a062aeb31b8ae', '暂无数据')} />;
    }

    const categories = [
      {
        title: i18nInstance.t('15d5d9ff9e3bbead979f01ed3cb49d2c', '进行中'),
        count: resourcesData.node.ready,
        color: '#1890ff',
        subtext: i18nInstance.t('1cd541f2e05b4b4f71d09d62df69f10a', '就绪节点'),
        completed: resourcesData.node.ready,
        total: resourcesData.node.total
      },
      {
        title: i18nInstance.t('3078bd68dd36e0e50b43a5a5b377701c', '已完成'),
        count: resourcesData.pod.allocated,
        color: '#ff4d4f',
        subtext: i18nInstance.t('b8921fbb0c6ab42911dfd752d095c252', '已分配Pod'),
        completed: resourcesData.pod.allocated,
        total: resourcesData.pod.capacity
      },
      {
        title: i18nInstance.t('6f13a917708cfd547e9617a95f7938b9', '商业版'),
        count: Math.round(resourcesData.cpu.usage), // 以核显示
        color: '#722ed1',
        subtext: i18nInstance.t('07267d1bb99c0e9d0646eae571ca9afb', 'CPU使用(核)'),
        completed: resourcesData.cpu.usage,
        total: resourcesData.cpu.capacity
      },
      {
        title: i18nInstance.t('dfef19e8c4e168600f58c3b8e31ef277', '居民版'),
        count: Math.round(resourcesData.memory.usage / 1024 / 1024), // 转为GB显示
        color: '#13c2c2',
        subtext: i18nInstance.t('89daa2a0673e61276eaabc0aa1298361', '内存使用(GB)'),
        completed: resourcesData.memory.usage,
        total: resourcesData.memory.capacity
      }
    ];

    return (
      <Row gutter={[16, 16]} className="mb-6">
        {categories.map((category, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card bordered={false}>
              <Statistic
                title={
                  <div className="flex flex-row items-center">
                    <span>{category.subtext}</span>
                    {category.completed > 0 && category.total > 0 && (
                      <Text type="secondary" className="ml-2 text-xs">
                        {Math.round((category.completed / category.total) * 100)}%
                      </Text>
                    )}
                  </div>
                }
                value={category.count}
                valueStyle={{ color: category.color }}
              />
              {category.completed > 0 && category.total > 0 && (
                <Progress 
                  percent={Math.min(Math.round((category.completed / category.total) * 100), 100)} 
                  strokeColor={category.color}
                  showInfo={false}
                  size="small"
                  className="mt-2"
                />
              )}
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // 修改renderNodeStatus函数，重新组织显示方式
  const renderNodeStatus = () => {
    return (
      <Spin spinning={isNodeLoading}>
        {nodeData && nodeData.items.length > 0 ? (
          <div>
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="mr-4">
                    <Statistic 
                      title={i18nInstance.t('15d5d9ff9e3bbead979f01ed3cb49d2c', '就绪节点')}
                      value={`${nodeData.summary.readyNum}/${nodeData.summary.totalNum}`}
                      valueStyle={{ color: '#1890ff', fontSize: 20 }}
                    />
                  </div>
                  <div>
                    <Progress 
                      type="circle" 
                      percent={Math.round((nodeData.summary.readyNum / nodeData.summary.totalNum) * 100)} 
                      width={60} 
                      strokeColor={getPercentColor(Math.round((nodeData.summary.readyNum / nodeData.summary.totalNum) * 100))}
                    />
                  </div>
                </div>
                
                <div className="flex">
                  {Object.entries(nodeData.items.reduce((acc, node) => {
                    acc[node.clusterName] = (acc[node.clusterName] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)).map(([cluster, count]) => (
                    <Tag color="blue" key={cluster} className="mr-2">
                      {cluster}: {count}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="overflow-auto" style={{ maxHeight: '400px' }}>
              <Table 
                dataSource={nodeData.items} 
                size="small"
                pagination={false}
                scroll={{ x: 800, y: 300 }}
                columns={[
                  {
                    title: i18nInstance.t('c35a681d41a9dcd9217e1bc21e5c808c', '集群'),
                    dataIndex: 'clusterName',
                    key: 'clusterName',
                    width: 100,
                    fixed: 'left',
                  },
                  {
                    title: i18nInstance.t('a10443964156a7532691a7c1d8a5d610', '节点名称'),
                    dataIndex: 'name',
                    key: 'name',
                    width: 180,
                    ellipsis: true,
                  },
                  {
                    title: i18nInstance.t('c0af5a6d0a161be903ec3390183b887e', '状态'),
                    dataIndex: 'status',
                    key: 'status',
                    width: 90,
                    render: (text: string, record: any) => (
                      <Badge status={record.ready ? 'success' : 'error'} text={record.ready ? '就绪' : '未就绪'} />
                    ),
                  },
                  {
                    title: i18nInstance.t('3fea7ca76cdece641436d7ab0d02ab1b', '角色'),
                    dataIndex: 'role',
                    key: 'role',
                    width: 100,
                    render: (text: string) => text || 'worker',
                  },
                  {
                    title: i18nInstance.t('42ccb9730b2948a5dda0a431bcb0eadd', 'CPU负载'),
                    key: 'cpu',
                    width: 150,
                    render: (text: string, record: any) => (
                      <div>
                        <div className="flex justify-between">
                          <span>{record.cpuUsage || 0}/{record.cpuCapacity}</span>
                          <span>{Math.round((record.cpuUsage || 0) / record.cpuCapacity * 100)}%</span>
                        </div>
                        <Progress 
                          percent={Math.round((record.cpuUsage || 0) / record.cpuCapacity * 100)} 
                          size="small" 
                          showInfo={false}
                          strokeColor={getPercentColor(Math.round((record.cpuUsage || 0) / record.cpuCapacity * 100))}
                        />
                      </div>
                    ),
                  },
                  {
                    title: i18nInstance.t('4da7a9e0a4129fc7c5a53bf938e17a05', '内存负载'),
                    key: 'memory',
                    width: 150,
                    render: (text: string, record: any) => (
                      <div>
                        <div className="flex justify-between">
                          <span>{Math.round((record.memoryUsage || 0) / 1024 / 1024)}GB/{Math.round(record.memoryCapacity / 1024 / 1024)}GB</span>
                          <span>{Math.round((record.memoryUsage || 0) / record.memoryCapacity * 100)}%</span>
                        </div>
                        <Progress 
                          percent={Math.round((record.memoryUsage || 0) / record.memoryCapacity * 100)} 
                          size="small" 
                          showInfo={false}
                          strokeColor={getPercentColor(Math.round((record.memoryUsage || 0) / record.memoryCapacity * 100))}
                        />
                      </div>
                    ),
                  },
                  {
                    title: i18nInstance.t('0e438c6062db435ab4647396b19a4dba', 'Pod状态'),
                    key: 'pod',
                    width: 120,
                    render: (text: string, record: any) => (
                      <div>
                        <div className="flex justify-between">
                          <span>{record.podUsage || 0}/{record.podCapacity}</span>
                          <span>{Math.round((record.podUsage || 0) / record.podCapacity * 100)}%</span>
                        </div>
                        <Progress 
                          percent={Math.round((record.podUsage || 0) / record.podCapacity * 100)} 
                          size="small" 
                          showInfo={false}
                          strokeColor={getPercentColor(Math.round((record.podUsage || 0) / record.podCapacity * 100))}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </div>
            
            <Divider className="my-2" />
            <div className="text-center">
              <Button type="link" onClick={() => navigate('/cluster-manage')}>
                {i18nInstance.t('a3b0de5784df7fd24b5a97e719f214a8', '查看所有节点')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center">
            <Empty description={i18nInstance.t('6f21c1bfa15eb362a82a062aeb31b8ae', '暂无数据')} />
          </div>
        )}
      </Spin>
    );
  };

  // 添加Pod状态详情展示
  const renderPodStatus = () => {
    if (!podData || podData.items.length === 0) {
      return (
        <div className="h-[200px] flex items-center justify-center">
          <Empty description={i18nInstance.t('6f21c1bfa15eb362a82a062aeb31b8ae', '暂无数据')} />
        </div>
      );
    }

    // 计算Pod状态数据
    const statusData = [
      { type: 'Running', value: podData.statusStats.running },
      { type: 'Pending', value: podData.statusStats.pending },
      { type: 'Succeeded', value: podData.statusStats.succeeded },
      { type: 'Failed', value: podData.statusStats.failed },
      { type: 'Unknown', value: podData.statusStats.unknown },
    ];

    // 准备命名空间统计数据
    const namespaceData = podData.namespaceStats
      .sort((a, b) => b.podCount - a.podCount)
      .slice(0, 5);

    return (
      <Spin spinning={isPodLoading}>
        <Row gutter={[16, 16]}>
          {/* Pod状态分布 */}
          <Col span={12}>
            <div className="card-title mb-2">{i18nInstance.t('f9b0d2b0ca9381a29d3335b70be3c5a1', 'Pod状态分布')}</div>
            <Pie 
              {...pieConfig} 
              data={statusData} 
              height={200}
              colorField="type"
              legend={{
                position: 'bottom'
              }}
            />
          </Col>
          
          {/* 命名空间分布 */}
          <Col span={12}>
            <div className="card-title mb-2">{i18nInstance.t('3f2b4e2e04b55c77da7a5c16c73c88c4', '命名空间分布（Top 5）')}</div>
            <Column 
              data={namespaceData}
              xField='namespace'
              yField='podCount'
              label={{
                position: 'middle',
                style: {
                  fill: '#FFFFFF',
                  opacity: 0.6,
                },
              }}
              colorField="namespace"
              height={200}
            />
          </Col>
        </Row>

        <Divider className="my-2" />

        <div className="text-center">
          <Button type="link" onClick={() => {}}>
            {i18nInstance.t('16e554d9aa0bd6fcf8a36cad74a467a5', '查看所有Pod')}
          </Button>
        </div>
      </Spin>
    );
  };

  return (
    <Panel>
      {!clusterName && (
        <Spin spinning={isResourcesLoading}>
          {renderStatisticCards()}
        </Spin>
      )}
      
      {!clusterName && (
        <>
          {/* 基本信息和最近事件 */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} md={8}>
              <Card title={i18nInstance.t('cf8a7f2456d7e99df632e6c081ca8a96', '基本信息')} bordered={false}>
                <Descriptions size="small" column={1} items={basicItems} />
              </Card>
            </Col>
            
            <Col xs={24} md={16}>
              <Card 
                title={
                  <div className="flex items-center justify-between">
                    <span>{i18nInstance.t('b3fb2beda48e46dd05fd0e8024c91209', '最近事件')}</span>
                    <Text type="secondary" className="text-xs cursor-pointer">查看全部</Text>
                  </div>
                } 
                bordered={false}
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  dataSource={recentClusterEvents}
                  columns={columns}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
          
          {/* 节点状态和Pod使用情况 */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} md={12}>
              <Card title={i18nInstance.t('b86224e030e5948f96b70a4c3600b33f', '节点状态')} bordered={false}>
                {renderNodeStatus()}
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card title={i18nInstance.t('f3a5da7a5dc22b3ee3c1aaa17bc47e8b', 'Pod使用情况')} bordered={false}>
                {renderPodStatus()}
              </Card>
            </Col>
          </Row>
        </>
      )}
      
      <div className="mb-6">
        <Title level={4} className="mb-4">
          {clusterName 
            ? i18nInstance.t('c1dc33b7b4649e28f142c6e609ee6c9c', '集群概览') + `: ${clusterName}` 
            : i18nInstance.t('c1dc33b7b4649e28f142c6e609ee6c9c', 'Kubernetes 集群列表')}
        </Title>
        <Spin spinning={isClusterLoading}>
          {clusterData?.clusters && clusterData.clusters.length > 0 ? (
            <Row gutter={[16, 16]}>
              {clusterData.clusters.map((cluster) => (
                <Col xs={24} sm={12} md={8} lg={6} key={cluster.objectMeta.name}>
                  <Card 
                    hoverable 
                    className="h-full" 
                    onClick={() => navigate(`/cluster-manage/${cluster.objectMeta.name}/overview`)}
                    style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    bodyStyle={{ padding: '16px', height: '100%' }}
                    actions={[
                      <Tooltip title={i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f', '查看详情')} key="view">
                        <InfoCircleFilled />
                      </Tooltip>,
                      <Tooltip title={i18nInstance.t('74ea72bbd64d8251bbc2642cc38e7bb1', '集群管理')} key="manage">
                        <Icons.clusters width={16} height={16} />
                      </Tooltip>,
                      <Tooltip title={i18nInstance.t('1200778cf86309309154ef88804fa22e', '更多')} key="more">
                        <QuestionCircleFilled />
                      </Tooltip>,
                    ]}
                  >
                    <div className="flex items-center">
                      <Avatar size={40} style={{ backgroundColor: cluster.ready ? '#1890ff' : '#ff4d4f' }}>
                        {cluster.objectMeta.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <div className="ml-3">
                        <div className="font-medium text-base">{cluster.objectMeta.name}</div>
                        <div className="text-xs text-gray-500">{cluster.kubernetesVersion || '未知版本'}</div>
                      </div>
                    </div>
                    
                    <div className="my-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between mb-2">
                        <Text type="secondary">就绪状态:</Text>
                        <Space>
                          {cluster.ready ? 
                            <CheckCircleFilled style={{ color: '#52c41a' }} /> : 
                            <CloseCircleFilled style={{ color: '#f5222d' }} />
                          }
                          <Text>{cluster.ready ? '已就绪' : '未就绪'}</Text>
                        </Space>
                      </div>
                      <div className="flex justify-between mb-2">
                        <Text type="secondary">同步模式:</Text>
                        <Tag color={cluster.syncMode === 'Push' ? "gold" : "blue"}>
                          {cluster.syncMode}
                        </Tag>
                      </div>
                      <div className="flex justify-between mb-2">
                        <Text type="secondary">节点状态:</Text>
                        <Text>{cluster.nodeSummary ? `${cluster.nodeSummary.readyNum}/${cluster.nodeSummary.totalNum}` : '-'}</Text>
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-1">
                        <div className="flex justify-between mb-1">
                          <Text type="secondary">CPU使用率:</Text>
                          <Text style={{ color: getPercentColor(cluster.allocatedResources.cpuFraction) }}>
                            {parseFloat(cluster.allocatedResources.cpuFraction.toFixed(2))}%
                          </Text>
                        </div>
                        <Progress 
                          percent={parseFloat(cluster.allocatedResources.cpuFraction.toFixed(2))} 
                          strokeColor={getPercentColor(cluster.allocatedResources.cpuFraction)}
                          showInfo={false}
                          size="small"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <Text type="secondary">内存使用率:</Text>
                          <Text style={{ color: getPercentColor(cluster.allocatedResources.memoryFraction) }}>
                            {parseFloat(cluster.allocatedResources.memoryFraction.toFixed(2))}%
                          </Text>
                        </div>
                        <Progress 
                          percent={parseFloat(cluster.allocatedResources.memoryFraction.toFixed(2))} 
                          strokeColor={getPercentColor(cluster.allocatedResources.memoryFraction)}
                          showInfo={false}
                          size="small"
                        />
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty
              description={i18nInstance.t('f69618f8da7e328ff3c7af3cfcbd3578', '没有可用的集群')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Spin>
      </div>
    </Panel>
  );
};

export default Overview;
