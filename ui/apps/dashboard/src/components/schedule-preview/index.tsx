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

import { SchedulePreviewResponse, ResourceDetailInfo, ActualClusterDistribution } from '@/services/overview';
import { Card, Empty, Spin, Tabs, Table, Badge, Statistic, Row, Col, Tooltip, Space, Tag, Progress, Alert, Button, Typography, message } from 'antd';
import i18nInstance from '@/utils/i18n';
import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import insertCss from 'insert-css';
import dayjs from 'dayjs';
import { CheckCircleOutlined, WarningOutlined, SyncOutlined } from '@ant-design/icons';

const { Text } = Typography;

// 插入自定义CSS样式
insertCss(`
  /* 表格样式增强 */
  .ant-table-tbody > tr:hover > td {
    background-color: #f0f7ff !important;
  }
  .ant-table-thead > tr > th {
    background-color: #f6f6f6 !important;
    font-weight: bold;
  }
  .ant-table {
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    border-radius: 8px;
    overflow: hidden;
  }
  
  /* 卡片彩色边框样式 - 全包裹式边框 */
  .schedule-preview-card {
    border: 2px solid #3aa1ff !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    position: relative;
  }
  
  /* 统计卡片样式 - 更紧凑的布局 */
  .statistic-card-clusters {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    background-color: rgba(146, 84, 222, 0.1);
    box-shadow: 0 2px 6px rgba(146, 84, 222, 0.15);
    height: 70px; /* 减小高度 */
  }
  
  .statistic-card-policy {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    background-color: rgba(78, 205, 196, 0.1);
    box-shadow: 0 2px 6px rgba(78, 205, 196, 0.15);
    height: 70px; /* 减小高度 */
  }
  
  .statistic-card-binding {
    border: none !important;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    background-color: rgba(255, 107, 107, 0.1);
    box-shadow: 0 2px 6px rgba(255, 107, 107, 0.15);
    height: 70px; /* 减小高度 */
  }
  
  /* 资源分布表格样式改为橙色边框 */
  .resource-dist-table {
    border: 2px solid #ff9800 !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(255, 152, 0, 0.15);
  }
  
  /* 自定义选项卡样式 */
  .schedule-preview-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #3aa1ff;
    font-weight: bold;
  }
  
  .schedule-preview-tabs .ant-tabs-ink-bar {
    background-color: #3aa1ff;
  }
  
  /* 资源分布统计选项卡样式 */
  .resource-dist-tab.ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #ff9800 !important;
    font-weight: bold;
  }
  
  .resource-dist-tab-active .ant-tabs-ink-bar {
    background-color: #ff9800 !important;
  }
`);

export interface SchedulePreviewProps {
  data?: SchedulePreviewResponse;
  loading: boolean;
  lastUpdatedAt?: number;
  onRefresh?: () => void;
  autoRefresh?: boolean;
  onToggleAutoRefresh?: () => void;
}

// 定义资源组类型
type ResourceGroupType = 'Workloads' | 'Network' | 'Configuration' | 'Storage' | 'Others';

// 定义配色方案
const colorScheme = {
  // 背景色
  background: '#1a1b22',
  // 节点颜色
  nodeColors: {
    controlPlane: '#3aa1ff', // 控制平面节点颜色 - 蓝色
    member: '#9254de',       // 成员集群节点颜色 - 紫色
  },
  // 资源类型分组及颜色
  resourceGroups: {
    Workloads: {
      color: '#ff6b6b',
      members: ['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'Pod', 'ReplicaSet']
    },
    Network: {
      color: '#4ecdc4',
      members: ['Service', 'Ingress']
    },
    Configuration: {
      color: '#ffbe0b',
      members: ['ConfigMap', 'Secret']
    },
    Storage: {
      color: '#8a5cf5',
      members: ['PersistentVolumeClaim']
    },
    Others: {
      color: '#8c8c8c',
      members: []
    } as const
  }
};

// 获取资源类型对应的分组
const getResourceGroup = (resourceType: string): ResourceGroupType => {
  // 工作负载
  if (['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'Pod', 'ReplicaSet'].includes(resourceType)) {
    return 'Workloads';
  }
  // 网络
  if (['Service', 'Ingress'].includes(resourceType)) {
    return 'Network';
  }
  // 配置
  if (['ConfigMap', 'Secret'].includes(resourceType)) {
    return 'Configuration';
  }
  // 存储
  if (['PersistentVolumeClaim'].includes(resourceType)) {
    return 'Storage';
  }
  // 其他
  return 'Others';
};

// 获取资源类型对应的颜色
const getResourceColor = (resourceType: string): string => {
  const group = getResourceGroup(resourceType);
  return colorScheme.resourceGroups[group].color;
};

// 获取分组对应的颜色
const getGroupColor = (group: ResourceGroupType): string => {
  return colorScheme.resourceGroups[group]?.color || colorScheme.resourceGroups.Others.color;
};

const SchedulePreview: React.FC<SchedulePreviewProps> = ({ 
  data, 
  loading, 
  lastUpdatedAt, 
  onRefresh, 
  autoRefresh = false, 
  onToggleAutoRefresh 
}) => {
  // 更新类型记录，用于表格过滤
  type ResourceRecord = {
    key: string;
    resourceType: string;
    resourceGroup: ResourceGroupType;
    clusterDist: any[];
    totalCount: number;
    actualTotalCount: number;
    clusterCount: number;
    consistencyRatio: number;
    resourceNames?: string[]; // 添加可选的资源名称字段
    policyNames?: string[]; // 添加传播策略名称字段
  };

  // 添加页面可见性变化检测
  const isDestroyed = useRef(false);
  
  // 在组件卸载时设置标志，避免对已卸载组件操作
  useEffect(() => {
    return () => {
      isDestroyed.current = true;
    };
  }, []);

  // 处理页面可见性变化，当页面重新变为可见时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoRefresh && onRefresh) {
        onRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, onRefresh]);

  // 计算资源分布数据
  const resourceDistData = useMemo(() => {
    if (!data || !data.resourceDist) {
      return [];
    }

    return data.resourceDist.map(item => {
      // 查找对应的实际部署数据
      const actualDist = data.actualResourceDist?.find(
        actual => actual.resourceType === item.resourceType
      );
      
      // 提取并统计该资源类型的传播策略信息
      const policyNames: string[] = [];
      if (data.detailedResources) {
        data.detailedResources.forEach(res => {
          if (res.resourceKind === item.resourceType && res.propagationPolicy && !policyNames.includes(res.propagationPolicy)) {
            policyNames.push(res.propagationPolicy);
          }
        });
      }
      
      // 对集群分布进行处理，添加实际部署信息
      const clusterDist = item.clusterDist.map(cluster => {
        // 查找对应集群的实际部署情况
        const actualClusterDist = actualDist?.clusterDist.find(
          actual => actual.clusterName === cluster.clusterName
        );
        
        // 获取该集群的权重信息
        let clusterWeight = undefined;
        if (data.detailedResources) {
          for (const res of data.detailedResources) {
            if (res.resourceKind === item.resourceType && 
                res.clusterWeights && 
                res.clusterWeights[cluster.clusterName]) {
              clusterWeight = res.clusterWeights[cluster.clusterName];
              break;
            }
          }
        }
        
        return {
          ...cluster,
          // 如果有实际部署信息，则添加；否则设为空或0
          actualCount: actualClusterDist?.actualCount || 0,
          scheduledCount: actualClusterDist?.scheduledCount || cluster.count,
          // 计算差异
          difference: (actualClusterDist?.actualCount || 0) - cluster.count,
          // 判断是否一致
          isConsistent: (actualClusterDist?.actualCount || 0) === cluster.count,
          // 添加权重信息
          weight: clusterWeight
        };
      });
      
      return {
        key: item.resourceType,
        resourceType: item.resourceType,
        resourceGroup: getResourceGroup(item.resourceType),
        clusterDist: clusterDist,
        totalCount: item.clusterDist.reduce((sum, cluster) => sum + cluster.count, 0),
        actualTotalCount: actualDist?.totalActualCount || 
                          clusterDist.reduce((sum, cluster) => sum + cluster.actualCount, 0),
        clusterCount: new Set(item.clusterDist.map(c => c.clusterName)).size,
        // 一致性指标：实际部署的资源数与计划部署的资源数之比
        consistencyRatio: actualDist ? 
          (actualDist.totalActualCount / (actualDist.totalScheduledCount || 1)) : 1,
        // 添加资源名称列表
        resourceNames: actualDist?.resourceNames || [],
        // 添加传播策略列表
        policyNames: policyNames.length > 0 ? policyNames : undefined
      };
    });
  }, [data]);

  // 格式化更新时间
  const formatLastUpdatedTime = () => {
    if (!lastUpdatedAt) return '';
    return dayjs(lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss');
  };

  // 处理图表错误
  const handleGraphError = (error: Error) => {
    console.error('图表渲染错误:', error);
  };

  // 在初始加载和数据变化时打印调试日志
  useEffect(() => {
    if (data) {
      console.log('调度数据已加载:', data);
    }
  }, [data]);

  return (
    <Card
      className="schedule-preview-card"
      loading={loading}
      title={
        <div className="flex items-center justify-between">
          <span>{i18nInstance.t('32aec2df59435fa80d2d1982b3446dbb', '集群资源调度预览')}</span>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {lastUpdatedAt && (
              <Text type="secondary" style={{ marginRight: '10px', fontSize: '12px' }}>
                {i18nInstance.t('93f926af36a3a0ab91b21a4e97d94cd7', '更新时间')}: {formatLastUpdatedTime()}
              </Text>
            )}
            {onRefresh && (
              <Button
                type="text"
                icon={<SyncOutlined />}
                onClick={onRefresh}
                style={{ marginRight: '0px' }}
                title={i18nInstance.t('20b9ec5834c2c149bfa27fe33ef4d745', '刷新')}
              />
            )}
          </div>
        </div>
      }
      bodyStyle={{ padding: '10px' }}
    >
      {data && (
        <>
          {/* 统计信息 - 缩小版 */}
          <Row gutter={16} className="mb-2">
            <Col span={8} key="cluster-count">
              <Card bordered={false} className="h-full shadow-sm statistic-card-clusters" styles={{ body: { padding: '12px' } }}>
                <Statistic 
                  title={<Text style={{ fontSize: '13px' }}>{i18nInstance.t('87c606f3c5912e85c0d357c9fce5e54f', '集群数量')}</Text>} 
                  value={data.summary.totalClusters} 
                  valueStyle={{ color: colorScheme.nodeColors.member, fontSize: '20px' }}
                  style={{ marginBottom: '0' }}
                />
              </Card>
            </Col>
            <Col span={8} key="propagation-policy">
              <Card bordered={false} className="h-full shadow-sm statistic-card-policy" styles={{ body: { padding: '12px' } }}>
                <Statistic 
                  title={<Text style={{ fontSize: '13px' }}>{i18nInstance.t('3c00dd2d7abfc8f8bf12bf9be6cb49a5', '传播策略')}</Text>} 
                  value={data.summary.totalPropagationPolicy} 
                  valueStyle={{ color: colorScheme.resourceGroups.Network.color, fontSize: '20px' }}
                  style={{ marginBottom: '0' }}
                />
              </Card>
            </Col>
            <Col span={8} key="resource-binding">
              <Card bordered={false} className="h-full shadow-sm statistic-card-binding" styles={{ body: { padding: '12px' } }}>
                <Statistic 
                  title={<Text style={{ fontSize: '13px' }}>{i18nInstance.t('dfa4c3b0aad87e9e7ba5a0623ec2c3d3', '资源绑定')}</Text>} 
                  value={data.summary.totalResourceBinding} 
                  valueStyle={{ color: colorScheme.resourceGroups.Workloads.color, fontSize: '20px' }}
                  style={{ marginBottom: '0' }}
                />
              </Card>
            </Col>
          </Row>

          <Tabs
            size="small"
            tabBarStyle={{ marginBottom: '8px' }}
            className="schedule-preview-tabs"
            defaultActiveKey="resourceDist"
            items={[
              {
                key: 'resourceDist',
                label: i18nInstance.t('4c1f8e6293268b9e1a911ee7d93f4c5a', '资源分布统计'),
                className: 'resource-dist-tab',
                children: (
                  <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px' }}>
                    <div className="resource-dist-table">
                      <Table
                        dataSource={resourceDistData}
                        pagination={false}
                        size="small"
                        rowKey="resourceType"
                        locale={{ emptyText: i18nInstance.t('b8dd9c5f3fe0e69e4a56a5b11a5f4c87', '暂无资源分布数据') }}
                        style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden' }}
                        columns={[
                          {
                            title: i18nInstance.t('b7fde1e005f73e8e69693f5f90e138a1', '资源类型'),
                            dataIndex: 'resourceType',
                            key: 'resourceType',
                            width: 220,
                            filters: Object.entries(colorScheme.resourceGroups).map(([group]) => ({
                              text: group,
                              value: group,
                              key: `filter-${group}`,
                            })),
                            onFilter: (value: any, record: ResourceRecord) => record.resourceGroup === value,
                            render: (text, record) => (
                              <div 
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column',
                                  gap: '8px',
                                  padding: '8px',
                                  background: '#f9f9f9',
                                  borderRadius: '6px',
                                  borderLeft: `4px solid ${getResourceColor(text)}`
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Badge
                                    color={getResourceColor(text)}
                                    text={<span style={{ fontWeight: 'bold', fontSize: '16px' }}>{text}</span>}
                                  />
                                </div>
                                
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  <Tag 
                                    color={getGroupColor(record.resourceGroup)} 
                                    style={{ fontSize: '13px', margin: 0 }}
                                  >
                                    {record.resourceGroup}
                                  </Tag>
                                </div>
                              </div>
                            ),
                          },
                          {
                            title: i18nInstance.t('8a6dff9bbefda5a12ade59faacd9851c', '资源名称'),
                            key: 'resourceNames',
                            width: 220,
                            render: (_, record) => (
                              <div style={{ 
                                padding: '8px', 
                                background: '#f9f9f9', 
                                borderRadius: '6px',
                                maxHeight: '80px',
                                overflowY: 'auto',
                                border: '1px solid #f0f0f0'
                              }}>
                                {record.resourceNames && record.resourceNames.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {record.resourceNames.map((name: string, index: number) => (
                                      <Tag 
                                        key={`resource-${index}`}
                                        color="processing"
                                        style={{ 
                                          margin: '2px', 
                                          fontSize: '13px',
                                        }}
                                      >
                                        {name}
                                      </Tag>
                                    ))}
                                  </div>
                                ) : (
                                  <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                                    暂无资源名称
                                  </Typography.Text>
                                )}
                              </div>
                            ),
                          },
                          {
                            title: i18nInstance.t('4b2fe09221d4ca90ee2acd2cc38c892a', '传播策略'),
                            key: 'propagationPolicy',
                            width: 180,
                            render: (_, record) => (
                              <div style={{ 
                                padding: '8px', 
                                background: '#f9f9f9', 
                                borderRadius: '6px',
                                border: '1px solid #f0f0f0'
                              }}>
                                {record.policyNames && record.policyNames.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {record.policyNames.map((policy: string, index: number) => (
                                      <Tag 
                                        key={`policy-${index}`}
                                        color="purple"
                                        style={{ 
                                          margin: '2px', 
                                          fontSize: '13px',
                                        }}
                                      >
                                        {policy}
                                      </Tag>
                                    ))}
                                  </div>
                                ) : (
                                  <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                                    暂无传播策略
                                  </Typography.Text>
                                )}
                              </div>
                            ),
                          },
                          {
                            title: i18nInstance.t('9db64fc5139a9a43a5f3e8ae8f7f3cb1', '服务总数'),
                            key: 'resourceCount',
                            width: 160,
                            sorter: (a: ResourceRecord, b: ResourceRecord) => a.totalCount - b.totalCount,
                            render: (text, record) => (
                              <div>
                                <div style={{ 
                                  padding: '8px 12px',
                                  background: '#f8f8f8',
                                  borderRadius: '6px',
                                  border: '1px solid #f0f0f0'
                                }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    gap: '6px'
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <span style={{ fontWeight: 'medium', color: '#666' }}>调度计划:</span>
                                      <span style={{ 
                                        fontWeight: 'bold', 
                                        color: '#fff',
                                        backgroundColor: '#1890ff',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '15px',
                                      }}>
                                        {record.totalCount}
                                      </span>
                                    </div>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <span style={{ fontWeight: 'medium', color: '#666' }}>实际部署:</span>
                                      <span style={{ 
                                        fontWeight: 'bold', 
                                        color: '#fff',
                                        backgroundColor: record.totalCount === record.actualTotalCount 
                                          ? '#52c41a' // 绿色表示一致
                                          : record.totalCount < record.actualTotalCount 
                                            ? '#722ed1' // 紫色表示实际多于计划
                                            : '#f5222d', // 红色表示实际少于计划
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '15px',
                                      }}>
                                        {record.actualTotalCount}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div style={{ marginTop: '8px' }}>
                                    <Progress 
                                      percent={Math.round(record.consistencyRatio * 100)} 
                                      size="small"
                                      status={
                                        record.consistencyRatio === 1 
                                          ? 'success' 
                                          : record.consistencyRatio > 0.8 
                                            ? 'normal' 
                                            : 'exception'
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          },
                          {
                            title: i18nInstance.t('3b5c24a09f316f42b0ac3ced25968959', '集群覆盖'),
                            dataIndex: 'clusterCount',
                            key: 'clusterCount',
                            width: 150,
                            sorter: (a: ResourceRecord, b: ResourceRecord) => a.clusterCount - b.clusterCount,
                            render: (text, record) => (
                              <div style={{ padding: '8px', background: '#f8f8f8', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '14px', color: '#666' }}>覆盖率:</span>
                                  <span style={{ 
                                    fontWeight: 'bold', 
                                    fontSize: '15px',
                                    color: '#fff',
                                    backgroundColor: text === data.summary.totalClusters ? '#52c41a' : '#1890ff',
                                    padding: '1px 8px',
                                    borderRadius: '10px',
                                  }}>
                                    {Math.round((text / data.summary.totalClusters) * 100)}%
                                  </span>
                                </div>
                                
                                <Tooltip title={`${text}/${data.summary.totalClusters} 个集群已部署`}>
                                  <Progress 
                                    percent={Math.round((text / data.summary.totalClusters) * 100)} 
                                    size="small"
                                    format={() => `${text}/${data.summary.totalClusters}`}
                                    strokeColor={getResourceColor(record.resourceType)}
                                  />
                                </Tooltip>
                              </div>
                            ),
                          },
                          {
                            title: i18nInstance.t('5e2f637c8c3bc68437b8209e6df87ad9', '集群分布'),
                            dataIndex: 'clusterDist',
                            key: 'clusterDist',
                            render: (clusterDist, record) => (
                              <div style={{ 
                                padding: '8px', 
                                background: '#f9f9f9', 
                                borderRadius: '6px',
                                border: '1px solid #f0f0f0' 
                              }}>
                                <div className="flex flex-wrap gap-2">
                                  {clusterDist.map((cluster: any, index: number) => (
                                    <Tooltip
                                      key={`cluster-tooltip-${cluster.clusterName}-${index}`}
                                      title={
                                        <div>
                                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{cluster.clusterName}</div>
                                          <div>调度计划: {cluster.count}</div>
                                          <div>实际部署: {cluster.actualCount}</div>
                                          <div>
                                            差异: 
                                            <span style={{ 
                                              color: cluster.difference > 0 ? '#52c41a' : 
                                                      cluster.difference < 0 ? '#f5222d' : '#666',
                                              fontWeight: 'bold',
                                              marginLeft: '4px'
                                            }}>
                                              {cluster.difference > 0 ? `+${cluster.difference}` : cluster.difference}
                                            </span>
                                          </div>
                                          {/* 显示集群权重 */}
                                          <div>
                                            集群权重: 
                                            <span style={{
                                              color: '#1890ff',
                                              fontWeight: 'bold',
                                              marginLeft: '4px'
                                            }}>
                                              {cluster.weight !== undefined ? cluster.weight : '未设置'}
                                            </span>
                                          </div>
                                        </div>
                                      }
                                    >
                                      <Tag
                                        style={{ 
                                          margin: '4px',
                                          borderColor: cluster.isConsistent ? '#52c41a' : '#f5222d',
                                          background: cluster.isConsistent ? '#f6ffed' : '#fff2f0',
                                          fontSize: '14px',
                                          padding: '2px 8px'
                                        }}
                                        icon={cluster.isConsistent ? <CheckCircleOutlined /> : <WarningOutlined />}
                                      >
                                        <span style={{ marginRight: '4px' }}>{cluster.clusterName}</span>
                                        <span style={{
                                          color: '#fff',
                                          background: cluster.isConsistent ? '#52c41a' : '#f5222d',
                                          padding: '0 4px',
                                          borderRadius: '10px',
                                          fontSize: '12px'
                                        }}>
                                          {cluster.actualCount}/{cluster.count}
                                        </span>
                                      </Tag>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            ),
                          },
                        ]}
                      />
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </Card>
  );
};

export default SchedulePreview;