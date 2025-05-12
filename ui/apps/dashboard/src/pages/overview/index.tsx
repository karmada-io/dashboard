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
import { Badge, Card, Col, Descriptions, DescriptionsProps, Progress, Row, Spin, Statistic, Tag, Tooltip, Typography, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetClusters } from '@/services';
import { GetOverview, GetSchedulePreview } from '@/services/overview.ts';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import SchedulePreview from '@/components/schedule-preview';
import insertCss from 'insert-css';

const { Text } = Typography;

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
    height: 100px; /* 减小高度 */
  }
  
  .overview-node-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(82, 196, 26, 0.15);
    position: relative;
    background-color: rgba(82, 196, 26, 0.08);
    height: 100px; /* 减小高度 */
  }
  
  .overview-pod-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(255, 77, 79, 0.15);
    position: relative;
    background-color: rgba(255, 77, 79, 0.08);
    height: 100px; /* 减小高度 */
  }
  
  .overview-cpu-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(114, 46, 209, 0.15);
    position: relative;
    background-color: rgba(114, 46, 209, 0.08);
    height: 100px; /* 减小高度 */
  }
  
  .overview-memory-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(19, 194, 194, 0.15);
    position: relative;
    background-color: rgba(19, 194, 194, 0.08);
    height: 100px; /* 减小高度 */
  }
  
  /* 基本信息卡片 */
  .overview-basic-info-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(250, 173, 20, 0.15);
    position: relative;
    background-color: rgba(250, 173, 20, 0.08);
    height: 100px; /* 减小高度 */
  }
  
  /* 集群数量卡片 */
  .overview-cluster-count-card {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(24, 144, 255, 0.15);
    position: relative;
    background-color: rgba(24, 144, 255, 0.08);
    height: 100px; /* 减小高度 */
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
  .status-basic-info-block { background-color: #faad14; }
  .status-cluster-block { background-color: #1890ff; }
  
  /* 第二行卡片样式 */
  .resource-stat-card {
    height: 80px; /* 更小的高度 */
    padding: 8px;
  }
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

  const { data, isLoading: isDataLoading } = useQuery({
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

  // 获取集群调度预览数据 - 只显示Karmada调度的资源
  const { data: scheduleData, isLoading: isScheduleLoading, refetch: refetchScheduleData, dataUpdatedAt } = useQuery({
    queryKey: ['GetSchedulePreview'],
    queryFn: async () => {
      console.log('正在获取调度预览数据，时间戳:', new Date().toISOString());
      try {
        const ret = await GetSchedulePreview();
        console.log('成功获取调度预览数据');
        return ret.data;
      } catch (error) {
        console.error('获取调度预览数据失败:', error);
        throw error;
      }
    },
    // 仅在全局概览页面且自动刷新启用时获取
    enabled: !clusterName,
    // 根据autoRefresh状态决定是否启用自动刷新
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    // 设置refetchOnWindowFocus为true，确保窗口获得焦点时刷新数据
    refetchOnWindowFocus: true,
    // 设置不要重用缓存数据，保证每次刷新都从服务器获取最新数据
    staleTime: 0,
    // 设置重试策略
    retry: 1,
  });

  // 处理手动刷新
  const handleRefreshScheduleData = () => {
    console.log('手动刷新调度数据，时间戳:', new Date().toISOString());
    // 使用设置强制选项来确保不使用缓存
    refetchScheduleData({ cancelRefetch: true }).then(() => {
      console.log('调度数据已成功刷新');
    }).catch(error => {
      console.error('刷新调度数据出错:', error);
    });
  };

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

  // 更新渲染统计卡片函数 - 第一行
  const renderFirstRowCards = () => {
    if (!resourcesData || !data) return null;
    
    return (
      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={24} sm={12} md={6} lg={4} xl={4}>
          <Card
            bordered={false}
            className="shadow-sm overview-basic-info-card"
            styles={{ 
              body: { padding: '8px' },
            }}
          >
            <div className="status-value-container">
              <div className="status-value-block status-basic-info-block" style={{ fontSize: '22px', padding: '4px 8px', minWidth: '50px' }}>
                v{data?.karmadaInfo.version.gitVersion?.split('-')[0] || '-'}
              </div>
              <div>
                <div className="text-xs text-gray-500">{i18nInstance.t('66e8579fa53a0cdf402e882a3574a380', 'Karmada版本')}</div>
                <div className="text-sm">
                  <Badge
                    color={data?.karmadaInfo.status === 'running' ? 'green' : 'red'}
                    text={data?.karmadaInfo.status === 'running' ? '运行中' : '未知状态'}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  {data?.karmadaInfo.createTime && dayjs(data?.karmadaInfo.createTime).format('YYYY-MM-DD')}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6} lg={4} xl={4}>
          <Card
            bordered={false}
            className="shadow-sm overview-cluster-count-card"
            styles={{ 
              body: { padding: '8px' },
            }}
          >
            <div className="status-value-container">
              <div className="status-value-block status-cluster-block" style={{ fontSize: '22px', padding: '4px 8px', minWidth: '50px' }}>
                {clusterData?.clusters?.length || 0}
              </div>
              <div>
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
        
        <Col xs={24} sm={12} md={6} lg={4} xl={4}>
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
        
        <Col xs={24} sm={12} md={6} lg={4} xl={4}>
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
        
        <Col xs={24} sm={12} md={6} lg={4} xl={4}>
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
        
        <Col xs={24} sm={12} md={6} lg={4} xl={4}>
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
      </Row>
    );
  };

  // 第二行卡片 - 资源统计
  const renderSecondRowCards = () => {
    if (!data) return null;
    
    return (
      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={12} sm={8} md={4} lg={4} xl={4}>
          <Card
            bordered={false}
            className="shadow-sm"
            styles={{ 
              body: { padding: '8px', textAlign: 'center' },
            }}
          >
            <Statistic 
              title={<div style={{ fontSize: '12px' }}>{i18nInstance.t('6a73118a4a4d5159cbb889b3b3fbc157', '多集群应用程序传播策略')}</div>} 
              value={data?.clusterResourceStatus.propagationPolicyNum || 0}
              valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4} lg={4} xl={4}>
          <Card
            bordered={false}
            className="shadow-sm"
            styles={{ 
              body: { padding: '8px', textAlign: 'center' },
            }}
          >
            <Statistic 
              title={<div style={{ fontSize: '12px' }}>{i18nInstance.t('cee0aa74f1af5f41ee7e20044193498f', '多集群应用程序覆盖策略')}</div>} 
              value={data?.clusterResourceStatus.overridePolicyNum || 0}
              valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#13c2c2' }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4} lg={4} xl={4}>
          <Card
            bordered={false}
            className="shadow-sm"
            styles={{ 
              body: { padding: '8px', textAlign: 'center' },
            }}
          >
            <Statistic 
              title={<div style={{ fontSize: '12px' }}>WorkLoads</div>} 
              value={data?.clusterResourceStatus.workloadNum || 0}
              valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4} lg={4} xl={4}>
          <Card
            bordered={false}
            className="shadow-sm"
            styles={{ 
              body: { padding: '8px', textAlign: 'center' },
            }}
          >
            <Statistic 
              title={<div style={{ fontSize: '12px' }}>Service</div>} 
              value={data?.clusterResourceStatus.serviceNum || 0}
              valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4} lg={4} xl={4}>
          <Card
            bordered={false}
            className="shadow-sm"
            styles={{ 
              body: { padding: '8px', textAlign: 'center' },
            }}
          >
            <Statistic 
              title={<div style={{ fontSize: '12px' }}>NameSpace</div>} 
              value={data?.clusterResourceStatus.namespaceNum || 0}
              valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={12} sm={8} md={4} lg={4} xl={4}>
          <Card
            bordered={false}
            className="shadow-sm"
            styles={{ 
              body: { padding: '8px', textAlign: 'center' },
            }}
          >
            <Statistic 
              title={<div style={{ fontSize: '12px' }}>ConfigMap</div>} 
              value={data?.clusterResourceStatus.configNum || 0}
              valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 集群调度预览组件包装器，添加刷新控制
  const renderSchedulePreview = () => {
    return (
      <div className="mb-4">
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
        <Spin spinning={isResourcesLoading || isDataLoading || isClusterLoading}>
          {renderFirstRowCards()}
          {renderSecondRowCards()}
        </Spin>
      )}
      
      {!clusterName && (
        <div>
          {renderSchedulePreview()}
        </div>
      )}
    </Panel>
  );
};

export default Overview;
