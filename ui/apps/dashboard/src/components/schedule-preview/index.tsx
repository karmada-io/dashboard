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
    background-color: #f5f5f5 !important;
  }
  .ant-table-thead > tr > th {
    background-color: #f0f0f0 !important;
    font-weight: bold;
    text-align: center !important;
  }
  .ant-table {
    border-radius: 8px;
    overflow: hidden;
  }
  
  /* 强制所有列内容居中 */
  .ant-table-tbody > tr > td {
    text-align: center !important;
  }
  
  /* 卡片彩色边框样式 - 简洁版 */
  .schedule-preview-card {
    border: 1px solid #ddd !important;
    border-radius: 8px;
    overflow: hidden;
  }
  
  /* 资源分布表格样式 - 简洁版 */
  .resource-dist-table {
    border: 1px solid #ddd !important;
    border-radius: 8px;
    overflow: hidden;
  }
  
  /* 自定义选项卡样式 */
  .schedule-preview-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #1890ff;
    font-weight: bold;
  }
  
  .schedule-preview-tabs .ant-tabs-ink-bar {
    background-color: #1890ff;
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
    scheduledCount: number;
    actualTotalCount: number;
    clusterCount: number;
    consistencyRatio: number;
    resourceNames?: string[]; // 添加可选的资源名称字段
    resourceName?: string; // 单个资源名称字段
    namespace?: string; // 命名空间
    policyNames?: string[]; // 添加传播策略名称字段
    propagationPolicy?: string; // 添加传播策略字段
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
    if (!data || !data.detailedResources || !data.detailedResources.length) {
      return [];
    }

    return data.detailedResources.map(item => {
      // 获取该资源的集群分布情况
      const clusterDist = item.clusterDist.map(cluster => {
        return {
          clusterName: cluster.clusterName,
          count: cluster.scheduledCount || 0,
          scheduledCount: cluster.scheduledCount || 0,
          actualCount: cluster.actualCount || 0,
          // 计算差异
          difference: (cluster.actualCount || 0) - (cluster.scheduledCount || 0),
          // 判断是否一致
          isConsistent: (cluster.actualCount || 0) === (cluster.scheduledCount || 0),
          // 添加权重信息
          weight: item.clusterWeights?.[cluster.clusterName]
        };
      });
      
      // 为每个资源生成唯一键，确保多传播策略情况下能正确显示
      const uniqueKey = `${item.resourceKind}-${item.resourceName}-${item.namespace || ''}-${item.propagationPolicy || ''}`;
      
      return {
        key: uniqueKey,
        resourceType: item.resourceKind,
        resourceGroup: getResourceGroup(item.resourceKind),
        resourceName: item.resourceName,
        namespace: item.namespace,
        propagationPolicy: item.propagationPolicy,
        clusterDist: clusterDist,
        totalCount: item.totalScheduledCount || 0,
        scheduledCount: item.totalScheduledCount || 0,
        actualTotalCount: item.totalActualCount || 0,
        clusterCount: new Set(clusterDist.map(c => c.clusterName)).size,
        // 一致性指标：实际部署的资源数与计划部署的资源数之比
        consistencyRatio: item.totalActualCount / (item.totalScheduledCount || 1)
      };
    });
  }, [data]);

  // 格式化更新时间
  const formatLastUpdatedTime = () => {
    if (!lastUpdatedAt) return '';
    return dayjs(lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss');
  };

  // 在初始加载和数据变化时打印调试日志
  useEffect(() => {
    if (data) {
      console.log('调度数据已加载:', data);
      
      // 针对详细资源信息进行调试
      if (data.detailedResources && data.detailedResources.length > 0) {
        console.log('详细资源数据:', data.detailedResources);
        
        // 检查是否存在多个传播策略应用到同一资源的情况
        const resourceMap = new Map();
        data.detailedResources.forEach(resource => {
          const key = `${resource.resourceKind}-${resource.resourceName}`;
          if (!resourceMap.has(key)) {
            resourceMap.set(key, []);
          }
          resourceMap.get(key).push(resource);
        });
        
        // 找出应用了多个传播策略的资源
        const multiPolicyResources = Array.from(resourceMap.entries())
          .filter(([_, resources]) => resources.length > 1);
        
        if (multiPolicyResources.length > 0) {
          console.log('发现多传播策略资源:', multiPolicyResources);
        }
      }
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
          <Tabs
            size="small"
            tabBarStyle={{ marginBottom: '8px' }}
            className="schedule-preview-tabs"
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
                        rowKey="key"
                        locale={{ emptyText: i18nInstance.t('b8dd9c5f3fe0e69e4a56a5b11a5f4c87', '暂无资源分布数据') }}
                        style={{ background: '#fff', borderRadius: '8px' }}
                        columns={[
                          {
                            title: <div style={{ textAlign: 'center' }}>{i18nInstance.t('b7fde1e005f73e8e69693f5f90e138a1', '资源类型')}</div>,
                            dataIndex: 'resourceType',
                            key: 'resourceType',
                            width: 150,
                            align: 'center',
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
                                  gap: '4px',
                                  padding: '8px',
                                  borderLeft: `3px solid ${getResourceColor(text)}`,
                                  alignItems: 'center',
                                  textAlign: 'center'
                                }}
                              >
                                <Badge
                                  color={getResourceColor(text)}
                                  text={<span style={{ fontWeight: 'bold', fontSize: '14px' }}>{text}</span>}
                                />
                                <Tag 
                                  color={getGroupColor(record.resourceGroup)} 
                                  style={{ fontSize: '12px', margin: 0 }}
                                >
                                  {record.resourceGroup}
                                </Tag>
                              </div>
                            ),
                          },
                          {
                            title: <div style={{ textAlign: 'center' }}>{i18nInstance.t('8a6dff9bbefda5a12ade59faacd9851c', '资源名称')}</div>,
                            key: 'resourceName',
                            width: 180,
                            align: 'center',
                            render: (_, record) => (
                              <div style={{ 
                                padding: '8px',
                                textAlign: 'center'
                              }}>
                                {record.resourceName ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                    <Tag 
                                      color="processing"
                                      style={{ 
                                        margin: 0, 
                                        fontSize: '13px',
                                      }}
                                    >
                                      {record.resourceName}
                                    </Tag>
                                    {record.namespace && (
                                      <Tag 
                                        color="default"
                                        style={{ 
                                          margin: 0, 
                                          fontSize: '12px',
                                        }}
                                      >
                                        {record.namespace}
                                      </Tag>
                                    )}
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
                            title: <div style={{ textAlign: 'center' }}>{i18nInstance.t('4b2fe09221d4ca90ee2acd2cc38c892a', '传播策略')}</div>,
                            key: 'propagationPolicy',
                            width: 180,
                            align: 'center',
                            render: (_, record) => (
                              <div style={{ 
                                padding: '8px',
                                textAlign: 'center'
                              }}>
                                {record.propagationPolicy ? (
                                  <Tag 
                                    color="purple"
                                    style={{ 
                                      margin: 0, 
                                      fontSize: '13px',
                                    }}
                                  >
                                    {record.propagationPolicy}
                                  </Tag>
                                ) : (
                                  <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                                    暂无传播策略
                                  </Typography.Text>
                                )}
                              </div>
                            ),
                          },
                          {
                            title: <div style={{ textAlign: 'center' }}>
                              <Tooltip title="左侧数字表示调度计划数量，右侧数字表示实际部署数量">
                                {i18nInstance.t('c335768f01be88d098cb26097a5ddce7', '计划/部署')}
                              </Tooltip>
                            </div>,
                            key: 'scheduledAndActual',
                            width: 150,
                            align: 'center',
                            sorter: (a: ResourceRecord, b: ResourceRecord) => a.scheduledCount - b.scheduledCount,
                            render: (_, record) => (
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  background: '#f5f5f5',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  gap: '6px'
                                }}>
                                  <span style={{ 
                                    fontWeight: 'bold', 
                                    color: '#fff',
                                    backgroundColor: '#1890ff',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                  }}>
                                    {record.scheduledCount}
                                  </span>
                                  <span style={{ color: '#999', fontSize: '14px' }}>/</span>
                                  <span style={{ 
                                    fontWeight: 'bold', 
                                    color: '#fff',
                                    backgroundColor: record.scheduledCount === record.actualTotalCount 
                                      ? '#52c41a' // 绿色表示一致
                                      : record.scheduledCount < record.actualTotalCount 
                                        ? '#722ed1' // 紫色表示实际多于计划
                                        : '#f5222d', // 红色表示实际少于计划
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                  }}>
                                    {record.actualTotalCount}
                                  </span>
                                </div>
                              </div>
                            )
                          },
                          {
                            title: <div style={{ textAlign: 'center' }}>{i18nInstance.t('5e2f637c8c3bc68437b8209e6df87ad9', '集群分布')}</div>,
                            dataIndex: 'clusterDist',
                            key: 'clusterDist',
                            align: 'center',
                            render: (clusterDist, record) => (
                              <div style={{ padding: '4px', textAlign: 'center' }}>
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {clusterDist.map((cluster: any, index: number) => (
                                    <Tooltip
                                      key={`${record.key}-cluster-${cluster.clusterName}`}
                                      title={
                                        <div>
                                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{cluster.clusterName}</div>
                                          <div>调度计划: {cluster.scheduledCount}</div>
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
                                        </div>
                                      }
                                    >
                                      <Tag
                                        style={{ 
                                          margin: '2px',
                                          borderColor: cluster.isConsistent ? '#52c41a' : '#f5222d',
                                          background: cluster.isConsistent ? '#f6ffed' : '#fff2f0',
                                          fontSize: '13px'
                                        }}
                                        icon={cluster.isConsistent ? <CheckCircleOutlined /> : <WarningOutlined />}
                                      >
                                        {cluster.clusterName}
                                        {cluster.weight !== undefined && (
                                          <span style={{ margin: '0 3px', color: '#1890ff', fontWeight: 'bold' }}>
                                            权重:{cluster.weight}
                                          </span>
                                        )}
                                        <span style={{
                                          color: '#fff',
                                          background: cluster.isConsistent ? '#52c41a' : '#f5222d',
                                          padding: '0 3px',
                                          borderRadius: '10px',
                                          fontSize: '11px',
                                          marginLeft: '2px'
                                        }}>
                                          {cluster.scheduledCount}/{cluster.actualCount}
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