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

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SchedulePreviewResponse } from '@/services/overview';
import { Card, Table, Badge, Tooltip, Tag, Button, Select } from 'antd';
import i18nInstance from '@/utils/i18n';
import insertCss from 'insert-css';
import dayjs from 'dayjs';
import { CheckCircleOutlined, WarningOutlined, SyncOutlined } from '@ant-design/icons';
import { Key } from 'react';

const { Option } = Select;

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
`);

export interface SchedulePreviewProps {
  data?: SchedulePreviewResponse;
  loading: boolean;
  lastUpdatedAt?: number;
  onRefresh?: () => void;
  autoRefresh?: boolean;
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

interface ResourceRecord {
  key: string;
  resourceType: string;
  resourceGroup: ResourceGroupType;
  resourceName: string;
  namespace: string;
  propagationPolicy: string;
  clusterDist: {
    clusterName: string;
    count: number;
    scheduledCount: number;
    actualCount: number;
    difference: number;
    isConsistent: boolean;
    weight?: number;
  }[];
  totalCount: number;
  scheduledCount: number;
  actualTotalCount: number;
  clusterCount: number;
  consistencyRatio: number;
}

const SchedulePreview: React.FC<SchedulePreviewProps> = ({ 
  data, 
  loading, 
  lastUpdatedAt, 
  onRefresh, 
  autoRefresh = false
}) => {
  const isMounted = useRef(true);
  const lastDataRef = useRef(data);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedResourceGroup, setSelectedResourceGroup] = useState<ResourceGroupType | 'all'>('all');

  // 组件挂载状态管理
  useEffect(() => {
    isMounted.current = true;
    
    // 清理函数
    return () => {
      isMounted.current = false;
      lastDataRef.current = undefined;
      setError(null);
      setIsUpdating(false);
      setSelectedResourceGroup('all');
    };
  }, []);

  // 数据引用更新 - 使用 useMemo 优化性能，添加数据有效性检查
  const currentData = useMemo(() => {
    if (!isMounted.current || !data) return undefined;
    try {
      lastDataRef.current = data;
      return data;
    } catch (err) {
      console.error('数据处理错误:', err);
      return undefined;
    }
  }, [data]);

  // 安全的更新函数 - 添加额外的安全检查
  const safeSetState = useCallback((setter: any) => {
    if (!isMounted.current) return;
    try {
      requestAnimationFrame(() => {
        if (isMounted.current) {
          setter();
        }
      });
    } catch (err) {
      console.error('状态更新错误:', err);
      if (isMounted.current) {
        setError('状态更新失败');
      }
    }
  }, []);

  // 处理刷新 - 添加错误处理和防抖
  const handleRefresh = useCallback(() => {
    if (!onRefresh || !isMounted.current || loading || isUpdating) return;
    
    safeSetState(() => setIsUpdating(true));
    
    try {
      onRefresh();
    } catch (err) {
      console.error('刷新数据错误:', err);
      setError('刷新数据失败');
    } finally {
      safeSetState(() => setIsUpdating(false));
    }
  }, [onRefresh, loading, isUpdating, safeSetState]);

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

  // 过滤资源数据
  const filteredResourceData = useMemo(() => {
    if (!resourceDistData) return [];
    if (selectedResourceGroup === 'all') return resourceDistData;
    return resourceDistData.filter(record => record.resourceGroup === selectedResourceGroup);
  }, [resourceDistData, selectedResourceGroup]);

  // 格式化更新时间
  const formatLastUpdatedTime = useCallback(() => {
    if (!lastUpdatedAt || !isMounted.current) return '';
    try {
      return dayjs(lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss');
    } catch (err) {
      console.warn('时间格式化错误:', err);
      return '';
    }
  }, [lastUpdatedAt]);

  // 在初始加载和数据变化时打印调试日志
  useEffect(() => {
    if (data && isMounted.current) {
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

  // 处理页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoRefresh && !loading && !isUpdating) {
        handleRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, handleRefresh, loading, isUpdating]);

  // 错误处理
  useEffect(() => {
    if (error) {
      console.error('SchedulePreview 组件错误:', error);
    }
  }, [error]);

  // 优化渲染标题 - 使用 useMemo 缓存
  const titleContent = useMemo(() => {
    if (!isMounted.current) return null;

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>{i18nInstance.t('32aec2df59435fa80d2d1982b3446dbb', '集群资源调度统计')}</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {lastUpdatedAt && (
            <div style={{ marginRight: '10px', fontSize: '12px', color: 'rgba(0, 0, 0, 0.45)' }}>
              {i18nInstance.t('93f926af36a3a0ab91b21a4e97d94cd7', '更新时间')}: {formatLastUpdatedTime()}
            </div>
          )}
          {onRefresh && (
            <Button
              type="text"
              icon={<SyncOutlined spin={loading || isUpdating} />}
              onClick={handleRefresh}
              disabled={loading || isUpdating}
            />
          )}
        </div>
      </div>
    );
  }, [lastUpdatedAt, loading, isUpdating, handleRefresh, formatLastUpdatedTime]);

  // 优化渲染错误状态 - 使用 useMemo 缓存
  const errorContent = useMemo(() => {
    if (!error) return null;

    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ color: '#ff4d4f', marginBottom: '8px' }}>{error}</div>
        <Button 
          type="primary" 
          onClick={() => {
            if (isMounted.current) {
              setError(null);
              handleRefresh();
            }
          }}
        >
          {i18nInstance.t('重试')}
        </Button>
      </div>
    );
  }, [error, handleRefresh]);

  // 渲染资源组过滤器
  const renderResourceGroupFilter = useCallback(() => {
    return (
      <div style={{ marginBottom: '16px' }}>
        <Select
          value={selectedResourceGroup}
          onChange={(value: ResourceGroupType | 'all') => setSelectedResourceGroup(value)}
          style={{ width: 200 }}
        >
          <Option value="all">{i18nInstance.t('全部资源组')}</Option>
          {Object.keys(colorScheme.resourceGroups).map(group => (
            <Option key={group} value={group}>
              <Badge color={colorScheme.resourceGroups[group as ResourceGroupType].color} />
              <span style={{ marginLeft: '8px' }}>{group}</span>
            </Option>
          ))}
        </Select>
      </div>
    );
  }, [selectedResourceGroup]);

  // 渲染内容
  const renderContent = useCallback(() => {
    if (!data || !data.detailedResources) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
            {i18nInstance.t('b8dd9c5f3fe0e69e4a56a5b11a5f4c87', '暂无资源分布数据')}
          </span>
        </div>
      );
    }

    return (
      <>
        {renderResourceGroupFilter()}
        <Table<ResourceRecord>
          dataSource={filteredResourceData}
          pagination={false}
          size="small"
          rowKey="key"
          locale={{ 
            emptyText: (
              <div style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
                {i18nInstance.t('b8dd9c5f3fe0e69e4a56a5b11a5f4c87', '暂无资源分布数据')}
              </div>
            )
          }}
          style={{ 
            background: '#fff', 
            borderRadius: '8px' 
          }}
          columns={[
            {
              title: <div style={{ textAlign: 'center' }}>{i18nInstance.t('b7fde1e005f73e8e69693f5f90e138a1', '资源类型')}</div>,
              dataIndex: 'resourceType',
              key: 'resourceType',
              width: 150,
              align: 'center',
              render: (text: string, record: ResourceRecord) => (
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
              render: (_: any, record: ResourceRecord) => (
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
                          {i18nInstance.t('8c669a5e9ad11c4c91ba89ccde1e6167', '名称空间')}：{record.namespace}
                        </Tag>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: '13px' }}>
                      暂无资源名称
                    </span>
                  )}
                </div>
              ),
            },
            {
              title: <div style={{ textAlign: 'center' }}>{i18nInstance.t('4b2fe09221d4ca90ee2acd2cc38c892a', '传播策略')}</div>,
              key: 'propagationPolicy',
              width: 180,
              align: 'center',
              render: (_: any, record: ResourceRecord) => (
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
                    <span style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: '13px' }}>
                      暂无传播策略
                    </span>
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
              sorter: (a: any, b: any) => a.scheduledCount - b.scheduledCount,
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
                    {clusterDist.map((cluster: any) => (
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
      </>
    );
  }, [data, filteredResourceData, renderResourceGroupFilter]);

  return (
    <Card
      className="schedule-preview-card"
      loading={loading}
      title={titleContent}
      styles={{ 
        body: { padding: '10px' }
      }}
    >
      <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px' }}>
        <div className="resource-dist-table">
          {error ? errorContent : renderContent()}
        </div>
      </div>
    </Card>
  );
};

// 使用 React.memo 优化性能，添加自定义比较函数
export default React.memo(SchedulePreview, (prevProps, nextProps) => {
  // 只在必要时重新渲染
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.lastUpdatedAt === nextProps.lastUpdatedAt &&
    prevProps.autoRefresh === nextProps.autoRefresh &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
  );
});