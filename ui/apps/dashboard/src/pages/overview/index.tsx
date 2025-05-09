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
import { Badge, Card, Col, Descriptions, DescriptionsProps, Progress, Row, Spin, Statistic, Tag, Table, Tooltip, Space, Typography, Avatar, Empty, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetClusters } from '@/services';
import { GetOverview, GetNodeSummary, GetSchedulePreview } from '@/services/overview.ts';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Icons } from '@/components/icons';
import { CheckCircleFilled, CloseCircleFilled, InfoCircleFilled, QuestionCircleFilled } from '@ant-design/icons';
import { useState } from 'react';
import SchedulePreview from '@/components/schedule-preview';
import insertCss from 'insert-css';

const { Title, Text } = Typography;

// 修改CSS样式
insertCss(`
  /* 移除边框，使用背景色填充统计卡片 */
  .overview-stats-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(24, 144, 255, 0.15);
    position: relative;
    background-color: rgba(24, 144, 255, 0.08);
    height: 120px; /* 缩小高度 */
  }
  
  .overview-node-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(82, 196, 26, 0.15);
    position: relative;
    background-color: rgba(82, 196, 26, 0.08);
    height: 120px; /* 缩小高度 */
  }
  
  .overview-pod-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(255, 77, 79, 0.15);
    position: relative;
    background-color: rgba(255, 77, 79, 0.08);
    height: 120px; /* 缩小高度 */
  }
  
  .overview-cpu-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(114, 46, 209, 0.15);
    position: relative;
    background-color: rgba(114, 46, 209, 0.08);
    height: 120px; /* 缩小高度 */
  }
  
  .overview-memory-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(19, 194, 194, 0.15);
    position: relative;
    background-color: rgba(19, 194, 194, 0.08);
    height: 120px; /* 缩小高度 */
  }
  
  /* 基本信息卡片保留边框 */
  .overview-basic-info-card {
    border: 2px solid #faad14 !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    position: relative;
  }
  
  .overview-basic-info-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background-color: #faad14;
  }
  
  /* 集群数量卡片 */
  .overview-cluster-count-card {
    border: 2px solid #1890ff !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    position: relative;
  }
  
  .overview-cluster-count-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background-color: #1890ff;
  }
  
  /* 节点状态卡片 */
  .overview-node-status-card {
    border: 2px solid #52C41A !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    position: relative;
  }
  
  .overview-node-status-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background-color: #52C41A;
  }
  
  /* 集群卡片 */
  .overview-cluster-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(24, 144, 255, 0.15);
    position: relative;
    background-color: rgba(24, 144, 255, 0.08);
  }
  
  .overview-cluster-card:hover {
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.25) !important;
    transform: translateY(-2px);
    transition: all 0.3s;
  }
  
  /* 增强状态数值显示 */
  .status-value-container {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .status-value-block {
    font-size: 28px;
    font-weight: bold;
    padding: 6px 10px;
    border-radius: 6px;
    color: white;
    margin-right: 10px;
    min-width: 60px;
    text-align: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }
  
  .status-node-block { background-color: #52C41A; }
  .status-pod-block { background-color: #ff4d4f; }
  .status-cpu-block { background-color: #722ed1; }
  .status-memory-block { background-color: #13c2c2; }
`);

// 刷新时间间隔（30秒）
const REFRESH_INTERVAL = 30 * 1000;

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
  
  // 添加刷新状态控制 - 由于我们不需要改变这个状态，所以直接设为常量
  const autoRefresh = true;

  const { data } = useQuery({
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

  // 获取集群调度预览数据 - 只显示Karmada调度的资源
  const { data: scheduleData, isLoading: isScheduleLoading, refetch: refetchScheduleData, dataUpdatedAt } = useQuery({
    queryKey: ['GetSchedulePreview'],
    queryFn: async () => {
      const ret = await GetSchedulePreview(); // 现在后端已修改，只返回Karmada调度的资源
      return ret.data;
    },
    // 仅在全局概览页面且自动刷新启用时获取
    enabled: !clusterName,
    // 根据autoRefresh状态决定是否启用自动刷新
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
  });

  // 处理手动刷新
  const handleRefreshScheduleData = () => {
    refetchScheduleData();
  };

  // 以下是我们将需要展示的组件

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
            key="karmada-status-running"
            color={'green'}
            text={i18nInstance.t('d679aea3aae1201e38c4baaaeef86efe', '运行中')}
          />
        ) : (
          <Badge
            key="karmada-status-unknown"
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

  // 更新渲染统计卡片函数
  const renderStatisticCards = () => {
    if (!resourcesData) return null;
    
    return (
      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={24} sm={12} md={6} lg={3} xl={3}>
          <Card
            bordered={false}
            className="shadow-sm overview-cluster-card"
            styles={{ 
              body: { padding: '8px' },
            }}
          >
            <div className="status-value-container">
              <div className="status-value-block" 
                style={{ 
                  backgroundColor: '#1890ff',
                  color: 'white',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  minWidth: '50px',
                  textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}>
                {clusterData?.clusters?.length || 0}
              </div>
              <div style={{ width: 'calc(100% - 66px)' }}>
                <div className="text-xs text-gray-500">{i18nInstance.t('87c606f3c5912e85c0d357c9fce5e54f', '集群数量')}</div>
                <div className="text-sm truncate">
                  <Button type="link" size="small" style={{ padding: '0', height: 'auto', fontSize: '12px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => navigate('/cluster-manage')}>
                    {i18nInstance.t('a3b0de5784df7fd24b5a97e719f214a8', '查看所有节点')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6} lg={3} xl={3}>
          <Card
            bordered={false}
            className="shadow-sm overview-node-card"
            styles={{ 
              body: { padding: '8px' },
            }}
          >
            <div className="status-value-container">
              <div className="status-value-block status-node-block" style={{ fontSize: '22px', padding: '4px 8px', minWidth: '50px' }}>
                {resourcesData.node.ready}
              </div>
              <div>
                <div className="text-xs text-gray-500">{i18nInstance.t('b86224e030e5948f96b70a4c3600b33f', '可用节点状态')}</div>
                <div className="text-sm">{resourcesData.node.ready}/{resourcesData.node.total}</div>
              </div>
            </div>
            <Progress 
              percent={Math.round((resourcesData.node.ready / resourcesData.node.total) * 100)} 
              size="small"
              strokeColor={getPercentColor(Math.round((resourcesData.node.ready / resourcesData.node.total) * 100))}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6} lg={3} xl={3}>
          <Card
            bordered={false}
            className="shadow-sm overview-pod-card"
            styles={{ 
              body: { padding: '8px' },
            }}
          >
            <div className="status-value-container">
              <div className="status-value-block status-pod-block" style={{ fontSize: '22px', padding: '4px 8px', minWidth: '50px' }}>
                {resourcesData.pod.allocated}
              </div>
              <div>
                <div className="text-xs text-gray-500">{i18nInstance.t('f3a5da7a5dc22b3ee3c1aaa17bc47e8c', '应用程序Pod数量')}</div>
                <div className="text-sm">{resourcesData.pod.allocated}/{resourcesData.pod.capacity}</div>
              </div>
            </div>
            <Progress 
              percent={Math.round((resourcesData.pod.allocated / resourcesData.pod.capacity) * 100)} 
              size="small"
              strokeColor={getPercentColor(Math.round((resourcesData.pod.allocated / resourcesData.pod.capacity) * 100))}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6} lg={3} xl={3}>
          <Card
            bordered={false}
            className="shadow-sm overview-cpu-card"
            styles={{ 
              body: { padding: '8px' },
            }}
          >
            <div className="flex items-center justify-between">
              <div className="mr-2">
                <div className="text-xs text-gray-500 mb-1">{i18nInstance.t('763a78a5fc84dbca6f0137a591587f5f', 'CPU用量')}</div>
                <div className="text-sm font-medium">
                  {Math.round(resourcesData.cpu.usage * 100) / 100}/{resourcesData.cpu.capacity} 核
                </div>
              </div>
              <Progress 
                type="circle" 
                percent={Math.round(resourcesData.cpu.usage)} 
                size={58}
                strokeColor={getPercentColor(resourcesData.cpu.usage)}
                format={(percent) => (
                  <div className="text-center">
                    <div className="text-sm font-bold">{percent}%</div>
                  </div>
                )}
              />
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6} lg={3} xl={3}>
          <Card
            bordered={false}
            className="shadow-sm overview-memory-card"
            styles={{ 
              body: { padding: '8px' },
            }}
          >
            <div className="flex items-center justify-between">
              <div className="mr-2">
                <div className="text-xs text-gray-500 mb-1">{i18nInstance.t('8b2e672e8b847415a47cc2dd25a87a07', 'Memory用量')}</div>
                <div className="text-sm font-medium">
                  {Math.round(resourcesData.memory.usage / 1024 / 1024)} GB/
                  {Math.round(resourcesData.memory.capacity / 1024 / 1024)} GB
                </div>
              </div>
              <Progress 
                type="circle" 
                percent={Math.round((resourcesData.memory.usage / resourcesData.memory.capacity) * 100)} 
                size={58}
                strokeColor={getPercentColor(Math.round((resourcesData.memory.usage / resourcesData.memory.capacity) * 100))}
                format={(percent) => (
                  <div className="text-center">
                    <div className="text-sm font-bold">{percent}%</div>
                  </div>
                )}
              />
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={24} md={12} lg={9} xl={9}>
          <Card
            bordered={false}
            className="shadow-sm overview-stats-card"
            styles={{ 
              body: { padding: '8px' },
            }}
          >
            <Row gutter={[4, 8]}>
              <Col span={8}>
                <Statistic 
                  title={<div style={{ fontSize: '11px' }}>{i18nInstance.t('6a73118a4a4d5159cbb889b3b3fbc157', '多集群应用程序传播策略')}</div>} 
                  value={data?.clusterResourceStatus.propagationPolicyNum || 0}
                  valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title={<div style={{ fontSize: '11px' }}>{i18nInstance.t('cee0aa74f1af5f41ee7e20044193498f', '多集群应用程序覆盖策略')}</div>} 
                  value={data?.clusterResourceStatus.overridePolicyNum || 0}
                  valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#13c2c2' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title={<div style={{ fontSize: '11px' }}>{i18nInstance.t('f1f64d9fded4a72e82b1e9f8c42c3d60', '多集群应用程序模板')}</div>} 
                  value={data?.clusterResourceStatus.workloadNum || 0}
                  valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#ff4d4f' }}
                />
              </Col>
            </Row>
            <Row gutter={[4, 8]} className="mt-1">
              <Col span={8}>
                <Statistic 
                  title={<div style={{ fontSize: '11px' }}>{i18nInstance.t('44d4e7c3d38eb5e0818174e76cf42241', '集群应用暴露')}</div>} 
                  value={data?.clusterResourceStatus.serviceNum || 0}
                  valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#faad14' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title={<div style={{ fontSize: '11px' }}>{i18nInstance.t('8c669a5e9ad11c4c91ba89ccde1e6167', '命名空间')}</div>} 
                  value={data?.clusterResourceStatus.namespaceNum || 0}
                  valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title={<div style={{ fontSize: '11px' }}>{i18nInstance.t('cee0aa74f1af5f41ee7e20044193498f_config', '集群配置')}</div>} 
                  value={data?.clusterResourceStatus.configNum || 0}
                  valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    );
  };

  // 修改renderNodeStatus函数，减小尺寸
  const renderNodeStatus = () => {
    return (
      <Spin spinning={isNodeLoading}>
        {nodeData && nodeData.items.length > 0 ? (
          <div>
            <div className="mb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="mr-3">
                    <Statistic 
                      title={<Text style={{ fontSize: '13px' }}>{i18nInstance.t('15d5d9ff9e3bbead979f01ed3cb49d2c', '就绪节点')}</Text>}
                      value={`${nodeData.summary.readyNum}/${nodeData.summary.totalNum}`}
                      valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                    />
                  </div>
                  <div>
                    <Progress 
                      type="circle" 
                      percent={Math.round((nodeData.summary.readyNum / nodeData.summary.totalNum) * 100)} 
                      size={50} 
                      strokeColor={getPercentColor(Math.round((nodeData.summary.readyNum / nodeData.summary.totalNum) * 100))}
                    />
                  </div>
                </div>
                
                <div className="flex">
                  {Object.entries(nodeData.items.reduce((acc, node) => {
                    acc[node.clusterName] = (acc[node.clusterName] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)).map(([cluster, count], index) => (
                    <Tag color="blue" key={`cluster-count-${cluster}-${index}`} className="mr-1" style={{ fontSize: '12px' }}>
                      {cluster}: {count}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="overflow-auto" style={{ maxHeight: '300px' }}>
              <Table 
                dataSource={nodeData.items} 
                rowKey={(record) => `${record.clusterName}-${record.name}`}
                size="small"
                pagination={false}
                scroll={{ x: 800, y: 240 }}
                columns={[
                  {
                    title: i18nInstance.t('c35a681d41a9dcd9217e1bc21e5c808c', '集群'),
                    dataIndex: 'clusterName',
                    key: 'clusterName',
                    width: 90,
                    fixed: 'left',
                  },
                  {
                    title: i18nInstance.t('a10443964156a7532691a7c1d8a5d610', '节点名称'),
                    dataIndex: 'name',
                    key: 'name',
                    width: 160,
                    ellipsis: true,
                  },
                  {
                    title: i18nInstance.t('c0af5a6d0a161be903ec3390183b887e', '状态'),
                    dataIndex: 'status',
                    key: 'status',
                    width: 80,
                    render: (_, record) => (
                      <div style={{ padding: '8px', textAlign: 'center' }}>
                        <Badge
                          key={`status-${record.clusterName}-${record.name}`}
                          status={record.ready ? 'success' : 'error'}
                          text={record.ready ? '就绪' : '未就绪'}
                        />
                      </div>
                    ),
                  },
                  {
                    title: i18nInstance.t('3fea7ca76cdece641436d7ab0d02ab1b', '角色'),
                    dataIndex: 'role',
                    key: 'role',
                    width: 80,
                    render: (text: string) => text || 'worker',
                  },
                  {
                    title: i18nInstance.t('42ccb9730b2948a5dda0a431bcb0eadd', 'CPU负载'),
                    key: 'cpu',
                    width: 140,
                    render: (_, record) => (
                      <div>
                        <div className="flex justify-between" style={{ fontSize: '12px' }}>
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
                    width: 140,
                    render: (_, record) => (
                      <div>
                        <div className="flex justify-between" style={{ fontSize: '12px' }}>
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
                    render: (_, record) => (
                      <div>
                        <div className="flex justify-between" style={{ fontSize: '12px' }}>
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
            
            <div className="text-center mt-1">
              <Button type="link" size="small" onClick={() => navigate('/cluster-manage')}>
                {i18nInstance.t('a3b0de5784df7fd24b5a97e719f214a8', '查看所有节点')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <Empty description={i18nInstance.t('6f21c1bfa15eb362a82a062aeb31b8ae', '暂无数据')} />
          </div>
        )}
      </Spin>
    );
  };

  // 集群调度预览组件包装器，添加刷新控制
  const renderSchedulePreview = () => {
    return (
      <div className="mb-2">
        <SchedulePreview 
          data={scheduleData} 
          loading={isScheduleLoading} 
          lastUpdatedAt={dataUpdatedAt} 
          onRefresh={handleRefreshScheduleData}
          autoRefresh={autoRefresh}
        />
      </div>
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
        <div className="mb-2">
          {renderSchedulePreview()}
        </div>
      )}
      
      {!clusterName && (
        <Row gutter={[12, 12]} className="mb-4">
          <Col xs={24} md={12}>
            <Card title={i18nInstance.t('cf8a7f2456d7e99df632e6c081ca8a96', '基本信息')} 
                  bordered={false} 
                  className="h-full shadow-sm overview-basic-info-card"
                  styles={{ 
                    body: { padding: '12px' },
                    title: { fontSize: '15px', fontWeight: 'bold' }
                  }}>
              <Descriptions size="small" column={1} items={basicItems} />
            </Card>
          </Col>
          
          <Col xs={24} md={12}>
            <Card title={i18nInstance.t('b86224e030e5948f96b70a4c3600b33f', '可用节点状态')} 
                  bordered={false} 
                  className="h-full shadow-sm overview-node-status-card"
                  styles={{ 
                    body: { padding: '12px' },
                    title: { fontSize: '15px', fontWeight: 'bold' }
                  }}>
              {renderNodeStatus()}
            </Card>
          </Col>
        </Row>
      )}
      
      <div className="mb-4">
        <Title level={5} className="mb-3">
          {clusterName 
            ? i18nInstance.t('c1dc33b7b4649e28f142c6e609ee6c9c', '集群概览') + `: ${clusterName}` 
            : i18nInstance.t('c1dc33b7b4649e28f142c6e609ee6c9c', 'Kubernetes集群列表')}
        </Title>
        <Spin spinning={isClusterLoading}>
          {clusterData?.clusters && clusterData.clusters.length > 0 ? (
            <Row gutter={[12, 12]}>
              {clusterData.clusters.map((cluster) => (
                <Col xs={24} sm={12} md={8} lg={6} key={cluster.objectMeta.name}>
                  <Card 
                    hoverable 
                    className="h-full shadow-sm overview-cluster-card"
                    onClick={() => navigate(`/cluster-manage/${cluster.objectMeta.name}/overview`)}
                    styles={{ body: { padding: '16px', height: '100%' } }}
                    actions={[
                      <Tooltip title={i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f', '查看详情')} key={`view-${cluster.objectMeta.name}`}>
                        <InfoCircleFilled />
                      </Tooltip>,
                      <Tooltip title={i18nInstance.t('74ea72bbd64d8251bbc2642cc38e7bb1', '集群管理')} key={`manage-${cluster.objectMeta.name}`}>
                        <Icons.clusters width={16} height={16} />
                      </Tooltip>,
                      <Tooltip title={i18nInstance.t('1200778cf86309309154ef88804fa22e', '更多')} key={`more-${cluster.objectMeta.name}`}>
                        <QuestionCircleFilled />
                      </Tooltip>,
                    ]}
                  >
                    <div className="flex items-center">
                      <Avatar size={40} style={{ 
                        backgroundColor: cluster.ready ? '#1890ff' : '#ff4d4f',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}>
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
                            <CheckCircleFilled key="ready-icon" style={{ color: '#52c41a', fontSize: '16px' }} /> : 
                            <CloseCircleFilled key="not-ready-icon" style={{ color: '#f5222d', fontSize: '16px' }} />
                          }
                          <Text strong={true}>{cluster.ready ? '已就绪' : '未就绪'}</Text>
                        </Space>
                      </div>
                      <div className="flex justify-between mb-2">
                        <Text type="secondary">同步模式:</Text>
                        <Tag color={cluster.syncMode === 'Push' ? "gold" : "blue"} style={{ fontSize: '12px', padding: '0 6px' }}>
                          {cluster.syncMode}
                        </Tag>
                      </div>
                      <div className="flex justify-between mb-2">
                        <Text type="secondary">节点状态:</Text>
                        <Text strong={true} style={{ fontSize: '14px', color: '#52C41A' }}>
                          {cluster.nodeSummary ? `${cluster.nodeSummary.readyNum}/${cluster.nodeSummary.totalNum}` : '-'}
                        </Text>
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-1">
                        <div className="flex justify-between mb-1">
                          <Text type="secondary">CPU使用率:</Text>
                          <Text style={{ 
                            color: getPercentColor(cluster.allocatedResources.cpuFraction),
                            fontWeight: 'bold'
                          }}>
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
                          <Text style={{ 
                            color: getPercentColor(cluster.allocatedResources.memoryFraction),
                            fontWeight: 'bold'
                          }}>
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
