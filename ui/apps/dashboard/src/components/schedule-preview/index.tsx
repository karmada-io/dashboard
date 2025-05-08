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

import { SchedulePreviewResponse } from '@/services/overview';
import { Card, Empty, Spin, Tabs, Table, Badge, Statistic, Row, Col, Tooltip, Space, Tag, Progress, Alert, Button, Typography, message, Collapse } from 'antd';
import { FlowDirectionGraph } from '@ant-design/graphs';
import i18nInstance from '@/utils/i18n';
import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import insertCss from 'insert-css';
import ErrorBoundary from '@/components/error-boundary';
import dayjs from 'dayjs';
import { SyncOutlined, LockOutlined, UnlockOutlined, CheckCircleOutlined, WarningOutlined, ExclamationCircleOutlined, ApiOutlined } from '@ant-design/icons';

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
  
  /* 流向图节点样式 - 减小间距和调整布局 */
  .resource-flow-node {
    width: calc(100% - 16px);
    height: calc(100% - 16px);
    background-color: #f6f7f9;
    border-radius: 6px;
    padding: 8px 10px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    box-sizing: content-box;
  }

  .resource-flow-node-name {
    font-size: 15px;
    font-weight: bold;
    color: #252525;
    margin-bottom: 4px;
  }

  .resource-flow-node-metric {
    font-size: 13px;
    color: #666666;
    display: flex;
    justify-content: space-between;
  }

  .resource-flow-node-metric--value {
    font-weight: bold;
    color: #1890ff;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* 垂直图例样式 - 优化防止抖动 */
  .vertical-legend {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 8px;
    width: 120px;
    min-height: 280px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    border: 1px solid rgba(0,0,0,0.05);
    border-left: 3px solid #8a5cf5;
    transition: all 0.3s ease;
    will-change: transform;
  }
  
  .vertical-legend-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px;
    border-radius: 4px;
    transition: background-color 0.2s;
    height: 36px; 
    width: 100%;
    margin-bottom: 4px;
  }
  
  .vertical-legend-item:hover {
    background-color: rgba(0,0,0,0.03);
  }
  
  /* 添加占位符动画 */
  @keyframes pulse {
    0% { opacity: 0.3; }
    50% { opacity: 0.5; }
    100% { opacity: 0.3; }
  }
  
  .vertical-legend-placeholder {
    height: 36px;
    width: 100%;
    background-color: rgba(0,0,0,0.03);
    border-radius: 4px;
    margin-bottom: 4px;
    animation: pulse 1.5s infinite ease-in-out;
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
  
  /* 流向图容器样式 */
  .flow-chart-container {
    border: none !important;
    border-radius: 8px;
    position: relative;
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    height: 750px; /* 增大高度到750px */
    overflow: hidden;
  }
  
  /* 增加以确保内容正确渲染 */
  .flow-chart-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  /* 确保图例和流向图在小屏幕上也能正常展示 */
  .flow-chart-layout {
    display: flex;
    flex-direction: row;
    height: 100%;
  }
  
  @media (max-width: 768px) {
    .flow-chart-layout {
      flex-direction: column;
    }
    
    .vertical-legend {
      width: 100%;
      flex-direction: row;
      overflow-x: auto;
      margin-bottom: 10px;
      gap: 5px;
      height: auto;
      padding: 8px;
      min-height: unset;
    }
    
    .vertical-legend-item {
      margin-right: 5px;
      height: auto;
    }
  }
  
  /* 资源分布表格样式改为橙色边框 */
  .resource-dist-table {
    border: 2px solid #ff9800 !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(255, 152, 0, 0.15);
  }
  
  /* 锁定按钮样式 */
  .graph-lock-button {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 4px;
    padding: 4px;
    transition: all 0.3s;
  }

  .graph-lock-button:hover {
    background-color: rgba(255, 255, 255, 1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }
  
  /* 锁定覆盖层 - 透明但可捕获鼠标事件 */
  .graph-lock-overlay-transparent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0);
    z-index: 5;
    cursor: not-allowed;
    pointer-events: all; /* 确保捕获所有鼠标事件 */
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

// 流向图节点组件
const ResourceFlowNode = ({ data }: { data: any }) => {
  const isControlPlane = data.id === 'karmada-control-plane' || data.nodeType === 'control-plane';
  const isResourceGroup = data.nodeType === 'resource-group';
  const isMemberCluster = data.nodeType === 'member-cluster';
  
  // 根据节点类型选择不同的边框颜色
  let borderColor = isControlPlane 
    ? '#1890ff' 
    : isResourceGroup 
      ? '#9254de' 
      : '#52C41A';
  
  // 根据节点类型选择不同的背景颜色
  let backgroundColor = isControlPlane 
    ? 'rgba(24, 144, 255, 0.15)' 
    : isResourceGroup 
      ? 'rgba(146, 84, 222, 0.1)' 
      : 'rgba(82, 196, 26, 0.1)';
  
  // 控制平面节点使用纯色填充
  if (isControlPlane) {
    backgroundColor = 'rgba(24, 144, 255, 0.2)';
    borderColor = '#1890ff';
  }
  
  // 根据是否有差异状态，调整显示状态
  const hasDiff = data.status === 'inconsistent' || data.status === 'diff';
  let statusText = '一致';
  let statusIcon = <CheckCircleOutlined style={{ color: '#52c41a' }} />; 
  
  if (hasDiff) {
    statusText = '不一致';
    statusIcon = <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
  }
  
  // 显示集群调度参数
  const renderSchedulingParams = () => {
    if (!isMemberCluster || !data.schedulingParams) return null;
    
    return (
      <div style={{ 
        marginTop: '5px', 
        padding: '5px', 
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        {/* 显示权重 */}
        {data.schedulingParams.weight && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
            <Badge status="processing" />
            <span style={{ marginLeft: '4px' }}>权重: {data.schedulingParams.weight}</span>
          </div>
        )}
        
        {/* 显示污点 */}
        {data.schedulingParams.taints && data.schedulingParams.taints.length > 0 && (
          <div style={{ marginTop: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Badge status="warning" />
              <span style={{ marginLeft: '4px' }}>污点:</span>
            </div>
            <div style={{ marginLeft: '12px', marginTop: '2px' }}>
              {data.schedulingParams.taints.map((taint: any, idx: number) => (
                <Tag key={idx} color="orange" style={{ margin: '2px' }}>
                  {taint.key}:{taint.effect}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '8px',
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        backgroundColor,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* 节点标题 */}
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text strong style={{ fontSize: '16px' }}>
            {data.name || data.label}
          </Typography.Text>
          
          {!isControlPlane && !isResourceGroup && data.status && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {statusIcon}
              <span style={{ marginLeft: '4px', fontSize: '12px' }}>{statusText}</span>
            </div>
          )}
        </div>
        
        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
          {isControlPlane && '控制平面'}
          {isResourceGroup && '资源组'}
          {isMemberCluster && '成员集群'}
        </div>
      </div>
      
      {/* 节点内容 */}
      <div style={{ flex: 1, overflow: 'hidden', marginTop: '5px' }}>
        {isResourceGroup && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <div>
                {data.resourceTypes && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {data.resourceTypes.map((type: string, index: number) => (
                      <Tag key={index} color="blue">{type}</Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* 资源名称标签 */}
            {data.resourceNames && data.resourceNames.length > 0 && (
              <div style={{ marginTop: '5px', maxHeight: '65px', overflowY: 'auto' }}>
                <div style={{ marginBottom: '2px', fontSize: '13px' }}>资源名称：</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {data.resourceNames.map((name: string, idx: number) => (
                    <Tag key={idx} color="processing" style={{ margin: '2px' }}>{name}</Tag>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {isControlPlane && (
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <ApiOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <div style={{ marginTop: '5px', fontSize: '13px' }}>调度控制中心</div>
          </div>
        )}
        
        {isMemberCluster && (
          <div>
            {data.resourceCount !== undefined && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center', 
                padding: '5px',
                backgroundColor: 'rgba(0,0,0,0.03)',
                borderRadius: '4px'
              }}>
                <span style={{ fontSize: '13px' }}>调度资源数量</span>
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{data.resourceCount}</span>
              </div>
            )}
            
            {data.actualResourceCount !== undefined && data.resourceCount !== undefined && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '5px', 
                padding: '5px',
                backgroundColor: 'rgba(0,0,0,0.03)',
                borderRadius: '4px'
              }}>
                <span style={{ fontSize: '13px' }}>实际部署数量</span>
                <span style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px',
                  color: data.actualResourceCount < data.resourceCount ? '#f5222d' : '#52c41a'
                }}>
                  {data.actualResourceCount}
                </span>
              </div>
            )}
            
            {/* 渲染集群调度参数 */}
            {renderSchedulingParams()}
          </div>
        )}
      </div>
    </div>
  );
};

const SchedulePreview: React.FC<SchedulePreviewProps> = ({ 
  data, 
  loading, 
  lastUpdatedAt, 
  onRefresh, 
  autoRefresh = false, 
  onToggleAutoRefresh 
}) => {
  // 添加图表引用
  const graphRef = useRef<any>(null);
  
  // 添加状态来跟踪图表是否已经被销毁
  const isDestroyed = useRef(false);
  
  // 添加状态控制图表是否应该被渲染
  const [shouldRenderGraph, setShouldRenderGraph] = useState(true);
  
  // 添加状态跟踪渲染错误
  const [renderError, setRenderError] = useState(false);
  
  // 添加图表容器引用
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // 添加锁定状态
  const [isGraphLocked, setIsGraphLocked] = useState(false);

  // 增加布局是否准备好的状态
  const [layoutReady, setLayoutReady] = useState(false);
  
  // 增加渲染错误恢复函数
  const recoverFromError = useCallback(() => {
    if (renderError && graphRef.current) {
      console.log('尝试从渲染错误中恢复...');
      setRenderError(false);
      
      // 延迟后重新尝试渲染
      setTimeout(() => {
        try {
          if (graphRef.current && !isDestroyed.current) {
            graphRef.current.fitView();
            graphRef.current.zoomTo(0.85);
            graphRef.current.render();
          }
        } catch (e) {
          console.warn('恢复渲染失败:', e);
        }
      }, 500);
    }
  }, [renderError]);
  
  // 当数据变化时自动恢复
  useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      recoverFromError();
    }
  }, [data, recoverFromError]);

  // 切换锁定状态
  const toggleGraphLock = () => {
    setIsGraphLocked(!isGraphLocked);
  };

  // 创建流向图数据
  const flowData = useMemo(() => {
    if (!data || !data.nodes || !data.links || !Array.isArray(data.nodes) || !Array.isArray(data.links) || data.nodes.length === 0 || data.links.length === 0) {
      return { nodes: [], edges: [] };
    }

    // 创建节点和边的映射，用于计算节点的资源总数
    const nodeResourceCount: Record<string, number> = {};
    const nodeActualResourceCount: Record<string, number> = {};
    const resourceTypeStats: Record<string, { count: number, actualCount: number, group: ResourceGroupType }> = {};
    
    // 计算每个节点的资源总数
    data.links.forEach(link => {
      nodeResourceCount[link.source] = (nodeResourceCount[link.source] || 0) + link.value;
      nodeResourceCount[link.target] = (nodeResourceCount[link.target] || 0) + link.value;
      
      // 统计资源类型
      const group = getResourceGroup(link.type);
      if (!resourceTypeStats[link.type]) {
        resourceTypeStats[link.type] = {
          count: 0,
          actualCount: 0,
          group
        };
      }
      resourceTypeStats[link.type].count += link.value;
    });
    
    // 如果有实际部署数据，计算每个节点的实际资源数
    if (data.actualResourceDist && data.actualResourceDist.length > 0) {
      data.actualResourceDist.forEach(resource => {
        resource.clusterDist.forEach(cluster => {
          // 累加集群的实际资源数
          nodeActualResourceCount[cluster.clusterName] = (nodeActualResourceCount[cluster.clusterName] || 0) + cluster.actualCount;
          // 累加控制平面的实际资源数
          nodeActualResourceCount['karmada-control-plane'] = (nodeActualResourceCount['karmada-control-plane'] || 0) + cluster.actualCount;
          
          // 更新资源类型统计
          if (resourceTypeStats[resource.resourceType]) {
            resourceTypeStats[resource.resourceType].actualCount += cluster.actualCount;
          }
        });
      });
    } else {
      // 如果没有实际部署数据，假设实际部署与计划一致
      Object.keys(nodeResourceCount).forEach(node => {
        nodeActualResourceCount[node] = nodeResourceCount[node];
      });
      
      Object.keys(resourceTypeStats).forEach(type => {
        resourceTypeStats[type].actualCount = resourceTypeStats[type].count;
      });
    }

    // 处理节点数据
    const nodes = data.nodes.map(node => {
      const isControlPlane = node.id === 'karmada-control-plane' || node.type === 'control-plane';
      const scheduledCount = nodeResourceCount[node.id] || 0;
      const actualCount = nodeActualResourceCount[node.id] || 0;
      const consistencyRatio = scheduledCount > 0 ? actualCount / scheduledCount : 1;
      
      return {
        id: node.id,
        name: node.name || node.id,
        nodeType: node.type,
        resourceCount: scheduledCount,
        actualResourceCount: actualCount,
        consistencyRatio: consistencyRatio,
        layerName: isControlPlane ? 'ControlPlane' : 'MemberClusters',
        measure: {
          name: '资源数',
          value: scheduledCount,
          formattedValue: scheduledCount,
          formattedUnit: '个',
        },
        actualMeasure: {
          name: '实际资源数',
          value: actualCount,
          formattedValue: actualCount,
          formattedUnit: '个',
        },
        relatedMeasures: [],
        compareMeasures: [],
        style: {
          stroke: isControlPlane ? colorScheme.nodeColors.controlPlane : colorScheme.nodeColors.member,
        },
        // 保留调度参数信息
        schedulingParams: node.schedulingParams,
        status: consistencyRatio !== 1 ? 'diff' : 'consistent',
      };
    });

    // 按资源类型分组处理连接
    const groupedEdges = new Map<string, any>();
    
    data.links.forEach(link => {
      const resourceType = link.type;
      const group = getResourceGroup(resourceType);
      const groupColor = getGroupColor(group);
      
      // 创建唯一键，用于合并相同类型的连接
      const key = `${link.source}->${link.target}->${group}`;
      
      if (groupedEdges.has(key)) {
        // 合并相同类型的连接
        const existingEdge = groupedEdges.get(key);
        existingEdge.measure.value += link.value;
        existingEdge.measure.formattedValue += link.value;
        existingEdge.resourceTypes.push(resourceType);
        existingEdge.counts[resourceType] = link.value;
      } else {
        // 查找实际部署信息
        let actualCount = link.value; // 默认与计划一致
        
        // 如果有实际资源部署信息，更新实际部署数量
        if (data.actualResourceDist) {
          const actualResource = data.actualResourceDist.find(r => r.resourceType === resourceType);
          if (actualResource) {
            const actualCluster = actualResource.clusterDist.find(c => c.clusterName === link.target);
            if (actualCluster) {
              actualCount = actualCluster.actualCount;
            }
          }
        }
        
        // 创建新的连接
        groupedEdges.set(key, {
          id: `edge-${link.source}-${link.target}-${group}`,
          source: link.source,
          target: link.target,
          resourceGroup: group,
          resourceTypes: [resourceType],
          counts: { [resourceType]: link.value },
          measure: {
            name: '计划资源数',
            value: link.value,
            formattedValue: link.value,
            formattedUnit: '个',
          },
          actualMeasure: {
            name: '实际资源数',
            value: actualCount,
            formattedValue: actualCount,
            formattedUnit: '个',
          },
          data: {
            type: 'proportion',
            ratio: link.value / nodeResourceCount[link.source],
            actualRatio: actualCount / (nodeActualResourceCount[link.source] || 1),
            group,
          },
          style: {
            stroke: groupColor,
            // 如果实际与计划不一致，增加虚线效果
            lineDash: actualCount !== link.value ? [5, 5] : [],
            // 如果实际为0，则显示警告色
            opacity: actualCount === 0 ? 0.4 : 0.8,
          }
        });
      }
    });
    
    // 创建中间层资源分组节点
    const resourceGroupNodes = Object.keys(colorScheme.resourceGroups).map(group => {
      // 计算该分组的资源总数与实际部署数量
      const groupResourceCount = Object.entries(resourceTypeStats)
        .filter(([_, stats]) => stats.group === group)
        .reduce((sum, [_, stats]) => sum + stats.count, 0);
      
      const groupActualResourceCount = Object.entries(resourceTypeStats)
        .filter(([_, stats]) => stats.group === group)
        .reduce((sum, [_, stats]) => sum + stats.actualCount, 0);
      
      if (groupResourceCount === 0) return null;
      
      const consistencyRatio = groupResourceCount > 0 ? groupActualResourceCount / groupResourceCount : 1;
      
      // 收集分组中的资源类型和资源名称
      const resourceTypesInGroup = Object.entries(resourceTypeStats)
        .filter(([_, stats]) => stats.group === group && stats.count > 0)
        .map(([type, _]) => type);
      
      // 查找资源名称
      let resourceNames: string[] = [];
      
      // 从actualResourceDist中查找所有该组资源类型的资源名称
      if (data.actualResourceDist) {
        // 收集该组所有资源类型的资源名称
        resourceTypesInGroup.forEach(resType => {
          const resourceInfo = data.actualResourceDist?.find(r => r.resourceType === resType);
          if (resourceInfo && resourceInfo.resourceNames) {
            resourceNames = [...resourceNames, ...resourceInfo.resourceNames];
          }
        });
        
        // 去重
        resourceNames = [...new Set(resourceNames)];
      }
      
      return {
        id: `group-${group}`,
        name: group,
        nodeType: 'resource-group',
        resourceTypes: resourceTypesInGroup,
        resourceNames: resourceNames,  // 添加资源名称数据
        resourceCount: groupResourceCount,
        actualResourceCount: groupActualResourceCount,
        consistencyRatio: consistencyRatio,
        layerName: 'ResourceGroups',
        measure: {
          name: '计划资源数',
          value: groupResourceCount,
          formattedValue: groupResourceCount,
          formattedUnit: '个',
        },
        actualMeasure: {
          name: '实际资源数',
          value: groupActualResourceCount,
          formattedValue: groupActualResourceCount,
          formattedUnit: '个',
        },
        relatedMeasures: [],
        compareMeasures: [],
        style: {
          stroke: colorScheme.resourceGroups[group as ResourceGroupType].color,
        },
      };
    }).filter(Boolean);
    
    // 从控制平面到资源组的边
    const controlPlaneToGroupEdges = resourceGroupNodes.map(node => {
      const group = node!.name as ResourceGroupType;
      const groupColor = colorScheme.resourceGroups[group].color;
      const consistencyRatio = node!.consistencyRatio;
      
      return { 
        id: `edge-karmada-control-plane-${node!.id}`,
        source: 'karmada-control-plane',
        target: node!.id,
        resourceGroup: group,
        measure: {
          name: '计划资源数',
          value: node!.resourceCount,
          formattedValue: node!.resourceCount,
          formattedUnit: '个',
        },
        actualMeasure: {
          name: '实际资源数',
          value: node!.actualResourceCount,
          formattedValue: node!.actualResourceCount,
          formattedUnit: '个',
        },
        data: {
          type: 'split',
          ratio: node!.resourceCount / (nodeResourceCount['karmada-control-plane'] || 1),
          actualRatio: node!.actualResourceCount / (nodeActualResourceCount['karmada-control-plane'] || 1),
          group,
        },
        style: {
          stroke: `l(0) 0:${colorScheme.nodeColors.controlPlane} 0.5:#7EC2F3 1:${groupColor}`,
          // 如果实际与计划不一致，增加虚线效果
          lineDash: consistencyRatio !== 1 ? [5, 5] : [],
          // 如果实际为0，则显示警告色
          opacity: node!.actualResourceCount === 0 ? 0.4 : 0.8,
        }
      };
    });
    
    // 从资源组到成员集群的边
    const groupToMemberEdges: any[] = [];
    
    Array.from(groupedEdges.values()).forEach(edge => {
      if (edge.source === 'karmada-control-plane') {
        const groupNode = `group-${edge.resourceGroup}`;
        const nodeData = resourceGroupNodes.find(n => n?.id === groupNode);
        if (!nodeData) return;
        
        const consistencyRatio = edge.actualMeasure.value / edge.measure.value;
        
        groupToMemberEdges.push({
          id: `edge-${groupNode}-${edge.target}`,
          source: groupNode,
          target: edge.target,
          resourceGroup: edge.resourceGroup,
          resourceTypes: edge.resourceTypes,
          counts: edge.counts,
          measure: edge.measure,
          actualMeasure: edge.actualMeasure,
          data: {
            type: 'proportion',
            ratio: edge.measure.value / nodeData.resourceCount,
            actualRatio: edge.actualMeasure.value / nodeData.actualResourceCount,
            group: edge.resourceGroup,
          },
          style: {
            stroke: `l(0) 0:${colorScheme.resourceGroups[edge.resourceGroup as ResourceGroupType].color} 0.5:#7EC2F3 1:${colorScheme.nodeColors.member}`,
            // 如果实际与计划不一致，增加虚线效果
            lineDash: consistencyRatio !== 1 ? [5, 5] : [],
            // 如果实际为0，则显示警告色
            opacity: edge.actualMeasure.value === 0 ? 0.4 : 0.8,
          }
        });
      }
    });
    
    return {
      nodes: [...nodes, ...resourceGroupNodes],
      edges: [...controlPlaneToGroupEdges, ...groupToMemberEdges]
    };
  }, [data]);

  // 准备资源分布表格数据
  const resourceDistData = useMemo(() => {
    if (!data || !data.resourceDist) {
      return [];
    }

    // 为每种资源类型添加分组信息
    return data.resourceDist.map(item => {
      // 查找对应的实际部署数据
      const actualDist = data.actualResourceDist?.find(
        actual => actual.resourceType === item.resourceType
      );
      
      // 对集群分布进行处理，添加实际部署信息
      const clusterDist = item.clusterDist.map(cluster => {
        // 查找对应集群的实际部署情况
        const actualClusterDist = actualDist?.clusterDist.find(
          actual => actual.clusterName === cluster.clusterName
        );
        
        return {
          ...cluster,
          // 如果有实际部署信息，则添加；否则设为空或0
          actualCount: actualClusterDist?.actualCount || 0,
          scheduledCount: actualClusterDist?.scheduledCount || cluster.count,
          // 计算差异
          difference: (actualClusterDist?.actualCount || 0) - cluster.count,
          // 判断是否一致
          isConsistent: (actualClusterDist?.actualCount || 0) === cluster.count
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
        resourceNames: actualDist?.resourceNames || []
      };
    });
  }, [data]);

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
  };

  // 在组件挂载后延迟设置 shouldRenderGraph 为 true
  useEffect(() => {
    // 设置页面可见状态变化监听
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时, 标记不应该渲染图表
        setShouldRenderGraph(false);
      } else {
        // 页面可见时, 标记应该渲染图表
        setShouldRenderGraph(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      // 移除页面可见状态变化监听
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // 组件卸载时销毁图表实例
      isDestroyed.current = true;
      
      // 增强销毁图表实例的逻辑
      if (graphRef.current) {
        try {
          // 多重检查确保实例存在且有效再进行销毁
          if (
            typeof graphRef.current.destroyed === 'boolean' && 
            !graphRef.current.destroyed && 
            typeof graphRef.current.destroy === 'function'
          ) {
            graphRef.current.destroy();
          }
          graphRef.current = null;
        } catch (e) {
          // 忽略销毁时的错误，但输出日志
          console.warn('销毁图表时出错:', e);
        }
      }
    };
  }, []);

  // 当数据变化时，如果图表已经存在，尝试更新而不是重新渲染
  useEffect(() => {
    // 只有当图表存在且没有发生渲染错误时才尝试更新数据
    if (graphRef.current && !isDestroyed.current && !renderError && 
        data && flowData.nodes.length > 0 && flowData.edges.length > 0) {
      try {
        const graph = graphRef.current;
        // 检查图表是否有效
        if (typeof graph.destroyed === 'boolean' && !graph.destroyed && typeof graph.changeData === 'function') {
          // 尝试使用数据更新图表而不是重新渲染
          graph.changeData(flowData);
        }
      } catch (e) {
        console.warn('更新图表数据时出错:', e);
        // 发生错误时，标记渲染错误，防止后续尝试更新
        setRenderError(true);
        
        // 尝试清理损坏的图表实例
        try {
          const graph = graphRef.current;
          graphRef.current = null;
          if (graph && typeof graph.destroyed === 'boolean' && !graph.destroyed && typeof graph.destroy === 'function') {
            graph.destroy();
          }
        } catch (destroyError) {
          console.warn('清理损坏的图表实例时出错:', destroyError);
        }
      }
    }
  }, [data, flowData, renderError]);

  // 替换监听容器大小变化的 useEffect
  useEffect(() => {
    if (!graphContainerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (graphRef.current && !isDestroyed.current) {
        try {
          const graph = graphRef.current;
          // 检查图表是否有效
          if (typeof graph.destroyed === 'boolean' && !graph.destroyed) {
            // 容器大小变化时调整图表大小
            if (typeof graph.resize === 'function') {
              graph.resize();
            }
            
            // 添加延迟调整位置的逻辑
            setTimeout(() => {
              if (!isDestroyed.current && graph && !graph.destroyed) {
                if (typeof graph.fitCenter === 'function') {
                  graph.fitCenter();
                }
                try {
                  // 尝试使用更通用的方法刷新布局
                  if (typeof graph.layout === 'function') {
                    graph.layout();
                  } else if (typeof graph.render === 'function') {
                    graph.render();
                  }
                } catch (e) {
                  console.warn('刷新布局时出错:', e);
                }
              }
            }, 100);
          }
        } catch (e) {
          console.warn('调整图表大小时出错:', e);
        }
      }
    });
    
    resizeObserver.observe(graphContainerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [shouldRenderGraph]);

  // 添加数据变化时重新布局的 useEffect
  useEffect(() => {
    // 当流向图数据变化后，如果图表实例已存在，则调整布局
    if (flowData.nodes.length > 0 && flowData.edges.length > 0 && graphRef.current && !isDestroyed.current) {
      const graph = graphRef.current;
      if (typeof graph.destroyed === 'boolean' && !graph.destroyed) {
        // 延迟执行以确保图表已完全渲染
        setTimeout(() => {
          if (!isDestroyed.current && graph && !graph.destroyed) {
            if (typeof graph.fitCenter === 'function') {
              graph.fitCenter();
            }
            try {
              // 尝试使用更通用的方法刷新布局
              if (typeof graph.layout === 'function') {
                graph.layout();
              } else if (typeof graph.render === 'function') {
                graph.render();
              }
            } catch (e) {
              console.warn('刷新布局时出错:', e);
            }
          }
        }, 300);
      }
    }
  }, [flowData]);

  // 格式化更新时间
  const formatLastUpdatedTime = () => {
    if (!lastUpdatedAt) return i18nInstance.t('fe9d3c42a76af06e21a2279e9d2f0fc9', '暂无数据');
    return dayjs(lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss');
  };

  // 添加调试日志，查看数据加载情况
  useEffect(() => {
    if (data) {
      console.log('调度数据已加载:', data);
      console.log('流向图数据节点数:', flowData.nodes.length);
      console.log('流向图数据边数:', flowData.edges.length);
    }
  }, [data, flowData]);

  // 添加对图表容器的尺寸检测
  useEffect(() => {
    if (graphContainerRef.current) {
      console.log('图表容器尺寸:', {
        width: graphContainerRef.current.clientWidth,
        height: graphContainerRef.current.clientHeight
      });
    }
  }, []);

  // 处理图表渲染错误
  const handleGraphError = (error: Error) => {
    console.error('流向图渲染错误:', error);
    setRenderError(true);
    
    // 如果图表实例存在，尝试销毁它
    if (graphRef.current) {
      try {
        const graph = graphRef.current;
        graphRef.current = null; // 先清空引用，防止重复销毁
        graph.destroy();
      } catch (e) {
        // 忽略销毁时的错误
        console.warn('销毁图表时出错:', e);
      }
    }
  };

  // 添加状态图例组件
  const StatusLegend = () => {
    return (
      <div style={{ 
        padding: '8px 12px', 
        background: '#fff', 
        borderRadius: '6px', 
        marginTop: '10px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <Text type="secondary" style={{ width: '100%', marginBottom: '4px', fontSize: '12px' }}>部署状态图例：</Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#f6f7f9', border: '1px solid #eee', borderRadius: '2px' }}></div>
          <Text style={{ fontSize: '12px' }}>调度计划与实际一致</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#fff1f0', border: '1px solid #eee', borderRadius: '2px' }}></div>
          <Text style={{ fontSize: '12px' }}>实际部署为0</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#fffbe6', border: '1px solid #eee', borderRadius: '2px' }}></div>
          <Text style={{ fontSize: '12px' }}>实际少于计划</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#f9f0ff', border: '1px solid #eee', borderRadius: '2px' }}></div>
          <Text style={{ fontSize: '12px' }}>实际多于计划</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '2px', background: '#aaa' }}></div>
          <Text style={{ fontSize: '12px' }}>实线表示一致</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            width: '16px', 
            height: '2px', 
            background: 'transparent',
            borderBottom: '2px dashed #aaa'
          }}></div>
          <Text style={{ fontSize: '12px' }}>虚线表示不一致</Text>
        </div>
      </div>
    );
  };

  // 修改垂直图例组件实现
  const VerticalLegend = () => {
    const [loaded, setLoaded] = useState(false);
    
    // 在组件挂载后延迟设置loaded状态以确保平滑过渡
    useEffect(() => {
      const timer = setTimeout(() => {
        setLoaded(true);
      }, 50);
      
      return () => clearTimeout(timer);
    }, []);
    
    return (
      <div className="vertical-legend">
        <div className="text-center mb-2">
          <Text type="secondary" className="text-sm font-medium">
            {i18nInstance.t('d5d5d1f16ece92ab99b4dcc7bb859e3b', '资源类型图例')}
          </Text>
        </div>
        {loaded ? (
          Object.entries(colorScheme.resourceGroups).map(([group, config]) => (
            <div key={`group-${group}`} className="vertical-legend-item">
              <Tag 
                color={config.color}
                style={{ 
                  marginBottom: '0', 
                  fontSize: '12px', 
                  padding: '1px 8px',
                  borderRadius: '12px',
                  width: '100%',
                  textAlign: 'center'
                }}
              >
                {group}
              </Tag>
            </div>
          ))
        ) : (
          // 显示占位符
          Array.from({ length: 5 }).map((_, index) => (
            <div key={`placeholder-${index}`} className="vertical-legend-placeholder"></div>
          ))
        )}
        
        {/* 添加状态图例 */}
        <StatusLegend />
      </div>
    );
  };

  // 添加窗口大小变化监听
  useEffect(() => {
    const handleWindowResize = () => {
      if (graphRef.current && !isDestroyed.current) {
        try {
          const graph = graphRef.current;
          if (typeof graph.destroyed === 'boolean' && !graph.destroyed) {
            // 延迟执行以等待DOM更新完成
            setTimeout(() => {
              if (typeof graph.resize === 'function') {
                graph.resize();
              }
              if (typeof graph.fitCenter === 'function') {
                graph.fitCenter();
              }
              // 尝试重新渲染图表
              try {
                if (typeof graph.layout === 'function') {
                  graph.layout();
                } else if (typeof graph.render === 'function') {
                  graph.render();
                }
              } catch (e) {
                console.warn('窗口大小变化时刷新布局出错:', e);
              }
            }, 200);
          }
        } catch (e) {
          console.warn('窗口大小变化时调整图表出错:', e);
        }
      }
    };

    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [shouldRenderGraph]);

  // 添加数据变化时的状态重置
  useEffect(() => {
    if (data && flowData.nodes.length > 0 && flowData.edges.length > 0) {
      // 如果数据变化，重置布局状态
      setLayoutReady(false);
      
      // 延迟一段时间后，如果图表实例存在，主动触发一次渲染
      setTimeout(() => {
        if (graphRef.current && !isDestroyed.current) {
          try {
            graphRef.current.fitView();
            graphRef.current.zoomTo(0.85);
            
            // 标记布局已准备好
            setLayoutReady(true);
          } catch (e) {
            console.warn('数据变化后调整图表失败:', e);
          }
        }
      }, 300);
    }
  }, [data]);

  return (
    <Spin spinning={loading}>
      <Card 
        title={i18nInstance.t('b50ac8089a3096636ae1aa7e5a61d80b', '集群调度预览')} 
        bordered={false} 
        className="shadow-sm schedule-preview-card"
        styles={{ 
          body: { padding: '12px' },
          title: { fontSize: '16px', fontWeight: 'bold' }
        }}
        extra={
          <div className="flex items-center">
            {lastUpdatedAt && (
              <Space size="small" className="mr-3">
                <Text type="secondary" className="text-sm">
                  {i18nInstance.t('2ca48325646a61d53eb35cb7e9c309c6', '上次更新时间')}:
                </Text>
                <Text className="text-sm">{formatLastUpdatedTime()}</Text>
              </Space>
            )}
            {onToggleAutoRefresh && onRefresh && (
              <Space size="small">
                <Button
                  type={autoRefresh ? "primary" : "default"}
                  size="small"
                  onClick={onToggleAutoRefresh}
                >
                  {autoRefresh 
                    ? i18nInstance.t('9f73314cbeef65d8fdc5d97c4cebf7c5', '自动刷新已开启') 
                    : i18nInstance.t('992a0f0542384f1ee5ef51b7cf4ae6c4', '自动刷新已关闭')}
                </Button>
                <Button 
                  type="default"
                  icon={<SyncOutlined />} 
                  size="small"
                  onClick={onRefresh}
                >
                  {i18nInstance.t('7ed21143bb50d5f9c19f5e1217587170', '刷新数据')}
                </Button>
              </Space>
            )}
          </div>
        }
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
              items={[
                {
                  key: 'flowChart',
                  label: i18nInstance.t('8a8b80cb1b0ac7e0463aa13840a1b17c', '调度流向图'),
                  children: (
                    <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '8px' }}>
                      {flowData.nodes.length > 0 && flowData.edges.length > 0 ? (
                        <div className="flow-chart-layout">
                          {/* 左侧垂直图例 */}
                          <VerticalLegend />
                          
                          {/* 右侧流向图 */}
                          <div 
                            ref={graphContainerRef}
                            style={{ 
                              flex: 1,
                              background: '#fff', 
                              borderRadius: '12px', 
                              padding: '12px',
                              marginLeft: '12px',
                              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                              position: 'relative',
                            }}
                            className="flow-chart-container"
                          >
                            {/* 添加锁定按钮 */}
                            <Button
                              size="small"
                              type={isGraphLocked ? "primary" : "default"}
                              icon={isGraphLocked ? <LockOutlined /> : <UnlockOutlined />}
                              onClick={() => {
                                toggleGraphLock();
                                if (!isGraphLocked) {
                                  message.info('图表已锁定，点击右上角按钮解锁可进行交互');
                                }
                              }}
                              className="graph-lock-button"
                              title={isGraphLocked ? "图表已锁定，点击解锁" : "图表未锁定，点击锁定"}
                            />
                            
                            {/* 透明覆盖层 - 用于阻止鼠标交互但不影响视觉效果 */}
                            {isGraphLocked && (
                              <div 
                                className="graph-lock-overlay-transparent" 
                                onClick={(e) => {
                                  // 阻止事件冒泡
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // 提示用户图表已锁定
                                  message.info('图表已锁定，点击右上角按钮解锁可进行交互');
                                }}
                              />
                            )}
                            
                            <div className="flow-chart-wrapper">
                              {flowData.nodes.length > 0 && flowData.edges.length > 0 ? (
                                <ErrorBoundary
                                  fallback={
                                    <div style={{ padding: '20px', textAlign: 'center' }}>
                                      <Alert
                                        message="图表渲染失败"
                                        description="无法加载流向图，请刷新页面重试。"
                                        type="error"
                                        showIcon
                                      />
                                    </div>
                                  }
                                  onError={handleGraphError}
                                >
                                  <FlowDirectionGraph 
                                    autoFit="center"
                                    width={graphContainerRef.current?.clientWidth ? graphContainerRef.current.clientWidth - 24 : 600}
                                    height={graphContainerRef.current?.clientHeight ? graphContainerRef.current.clientHeight - 24 : 500}
                                    padding={[40, 60, 40, 60]}
                                    data={flowData as any}
                                    node={{
                                      style: {
                                        component: (data: any) => <ResourceFlowNode data={data} />,
                                        size: [260, 150], // 增大节点尺寸高度
                                      },
                                    }}
                                    edge={{
                                      style: {
                                        labelText: (d: any) => {
                                          const { type, ratio, actualRatio } = d.data;
                                          const text = type === 'split' ? '分流' : '占比';
                                          const percentage = (Number(ratio) * 100).toFixed(1);
                                          
                                          // 如果计划与实际一致，只显示一个百分比
                                          if (ratio === actualRatio || !actualRatio) {
                                            return `${percentage}%`;
                                          }
                                          
                                          // 否则显示计划和实际的对比
                                          const actualPercentage = (Number(actualRatio) * 100).toFixed(1);
                                          return `计划${text} ${percentage}% / 实际${text} ${actualPercentage}%`;
                                        },
                                        labelBackground: true,
                                        labelFontSize: 14,
                                        opacity: 0.9,
                                      },
                                    }}
                                    transforms={(prev: any) => [
                                      ...prev,
                                      {
                                        type: 'map-edge-line-width',
                                        key: 'map-edge-line-width',
                                        value: (d: any) => d.data.ratio,
                                        minValue: 0,
                                        maxValue: 1,
                                        minLineWidth: 2, // 增加最小线宽
                                        maxLineWidth: 14, // 增加最大线宽
                                      },
                                    ]}
                                    layout={{
                                      type: 'antv-dagre',
                                      nodesep: 50, // 减小节点水平间距
                                      ranksep: 100, // 减小层级垂直间距
                                      controlPoints: true,
                                      rankdir: 'LR',
                                      align: 'UL',
                                      marginx: 30, // 减小边距
                                      marginy: 30, // 减小边距
                                    }}
                                    onReady={(graph) => {
                                      console.log('图表实例创建:', !!graph);
                                      
                                      if (!isDestroyed.current && graph) {
                                        // 保存有效的图表实例引用
                                        graphRef.current = graph;
                                        
                                        // 先设置不可见，避免闪烁
                                        const container = document.querySelector('.flow-chart-container');
                                        if (container) {
                                          const graphElem = container.querySelector('.ant-flow-direction-graph');
                                          if (graphElem) {
                                            (graphElem as HTMLElement).style.opacity = '0';
                                          }
                                        }
                                        
                                        // 多次尝试调整位置，确保图表正确显示
                                        const adjustTimes = [50, 150, 300, 600, 1000, 1500];
                                        let successfulRender = false;
                                        
                                        adjustTimes.forEach((delay, index) => {
                                          setTimeout(() => {
                                            if (!isDestroyed.current && graph && !graph.destroyed) {
                                              try {
                                                // 先使用fitView适配视图
                                                if (typeof graph.fitView === 'function') {
                                                  graph.fitView();
                                                }
                                                // 设置合适的缩放比例
                                                if (typeof graph.zoomTo === 'function') {
                                                  graph.zoomTo(0.85);
                                                }
                                                
                                                // 刷新布局
                                                if (typeof graph.layout === 'function') {
                                                  graph.layout();
                                                }
                                                
                                                // 刷新渲染
                                                if (typeof graph.render === 'function') {
                                                  graph.render();
                                                }
                                                
                                                // 最后一次调整后显示图表
                                                if (index === adjustTimes.length - 1 || index >= 2) {
                                                  const container = document.querySelector('.flow-chart-container');
                                                  if (container) {
                                                    const graphElem = container.querySelector('.ant-flow-direction-graph');
                                                    if (graphElem) {
                                                      (graphElem as HTMLElement).style.opacity = '1';
                                                      (graphElem as HTMLElement).style.transition = 'opacity 0.3s ease-in';
                                                    }
                                                  }
                                                  
                                                  // 标记布局已准备好
                                                  if (!successfulRender) {
                                                    successfulRender = true;
                                                    setLayoutReady(true);
                                                  }
                                                }
                                              } catch (e) {
                                                console.warn('调整图表失败:', e);
                                                // 如果最后一次尝试仍然失败，还是显示图表
                                                if (index === adjustTimes.length - 1) {
                                                  const container = document.querySelector('.flow-chart-container');
                                                  if (container) {
                                                    const graphElem = container.querySelector('.ant-flow-direction-graph');
                                                    if (graphElem) {
                                                      (graphElem as HTMLElement).style.opacity = '1';
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }, delay);
                                        });
                                      }
                                    }}
                                  />
                                </ErrorBoundary>
                              ) : (
                                <div style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column',
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  height: '100%',
                                  color: '#999'
                                }}>
                                  <Spin size="large" />
                                  <div style={{ marginTop: '12px' }}>加载图表中...</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Empty 
                          description={i18nInstance.t('a4879568c3a3ed9e7e2a2000e126baae', '暂无调度流向数据')} 
                          style={{ marginTop: '100px' }}
                        />
                      )}
                    </div>
                  ),
                },
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
                              render: (clusterDist) => (
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
    </Spin>
  );
};

export default SchedulePreview;