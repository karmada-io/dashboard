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
import { Card, Empty, Spin, Tabs, Table, Badge, Statistic, Row, Col, Tooltip, Space, Tag, Progress, Alert, Button, Typography } from 'antd';
import { FlowDirectionGraph } from '@ant-design/graphs';
import i18nInstance from '@/utils/i18n';
import { useMemo, useRef, useEffect, useState } from 'react';
import insertCss from 'insert-css';
import ErrorBoundary from '@/components/error-boundary';
import dayjs from 'dayjs';
import { SyncOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';

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

  /* 垂直图例样式 */
  .vertical-legend {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 8px;
    width: 120px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    border: 1px solid rgba(0,0,0,0.05);
    border-left: 3px solid #8a5cf5;
    animation: fadeIn 0.3s ease-in-out;
  }
  
  .vertical-legend-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .vertical-legend-item:hover {
    background-color: rgba(0,0,0,0.03);
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
    height: 550px; /* 适当增加高度 */
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
    }
    
    .vertical-legend-item {
      margin-right: 5px;
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
  
  /* 锁定覆盖层 */
  .graph-lock-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.5);
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: not-allowed;
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
    }
  } as const
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
  const nodeType = isControlPlane 
    ? i18nInstance.t('d3da66a9b128ce43c29b95a35fb5cdef', '控制平面') 
    : isResourceGroup
      ? i18nInstance.t('b7fde1e005f73e8e69693f5f90e138a1', '资源类型')
      : i18nInstance.t('58de9e3ce05d5f6eab77d20876ab1e3f', '成员集群');
  
  // 根据节点类型选择不同的边框颜色
  let borderColor = isControlPlane 
    ? colorScheme.nodeColors.controlPlane 
    : isResourceGroup
      ? colorScheme.resourceGroups[data.name as ResourceGroupType]?.color || colorScheme.resourceGroups.Others.color
      : colorScheme.nodeColors.member;
  
  return (
    <div className="resource-flow-node" style={{ borderLeft: `4px solid ${borderColor}` }}>
      <div className="resource-flow-node-name">{data.name}</div>
      <div className="resource-flow-node-metric">
        <div>{nodeType}</div>
        {data.resourceCount && (
          <div className="resource-flow-node-metric--value">
            {data.resourceCount} {i18nInstance.t('ca3c5f0304a60ce1abe05ec67f28dbde', '资源')}
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

  // 切换锁定状态
  const toggleGraphLock = () => {
    setIsGraphLocked(!isGraphLocked);
  };

  // 准备流向图的数据
  const flowData = useMemo(() => {
    if (!data || !data.nodes || !data.links || !Array.isArray(data.nodes) || !Array.isArray(data.links) || data.nodes.length === 0 || data.links.length === 0) {
      return { nodes: [], edges: [] };
    }

    // 创建节点和边的映射，用于计算节点的资源总数
    const nodeResourceCount: Record<string, number> = {};
    const resourceTypeStats: Record<string, { count: number, group: ResourceGroupType }> = {};
    
    // 计算每个节点的资源总数
    data.links.forEach(link => {
      nodeResourceCount[link.source] = (nodeResourceCount[link.source] || 0) + link.value;
      nodeResourceCount[link.target] = (nodeResourceCount[link.target] || 0) + link.value;
      
      // 统计资源类型
      const group = getResourceGroup(link.type);
      resourceTypeStats[link.type] = {
        count: (resourceTypeStats[link.type]?.count || 0) + link.value,
        group
      };
    });

    // 处理节点数据
    const nodes = data.nodes.map(node => {
      const isControlPlane = node.id === 'karmada-control-plane' || node.type === 'control-plane';
      return {
        id: node.id,
        name: node.name || node.id,
        nodeType: node.type,
        resourceCount: nodeResourceCount[node.id] || 0,
        layerName: isControlPlane ? 'ControlPlane' : 'MemberClusters',
        measure: {
          name: '资源数',
          value: nodeResourceCount[node.id] || 0,
          formattedValue: nodeResourceCount[node.id] || 0,
          formattedUnit: '个',
        },
        relatedMeasures: [],
        compareMeasures: [],
        style: {
          stroke: isControlPlane ? colorScheme.nodeColors.controlPlane : colorScheme.nodeColors.member,
        },
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
        // 创建新的连接
        groupedEdges.set(key, {
          id: `edge-${link.source}-${link.target}-${group}`,
          source: link.source,
          target: link.target,
          resourceGroup: group,
          resourceTypes: [resourceType],
          counts: { [resourceType]: link.value },
          measure: {
            name: '资源数',
            value: link.value,
            formattedValue: link.value,
            formattedUnit: '个',
          },
          data: {
            type: 'proportion',
            ratio: link.value / nodeResourceCount[link.source],
            group,
          },
          style: {
            stroke: groupColor,
          }
        });
      }
    });
    
    // 创建中间层资源分组节点
    const resourceGroupNodes = Object.keys(colorScheme.resourceGroups).map(group => {
      // 计算该分组的资源总数
      const groupResourceCount = Object.entries(resourceTypeStats)
        .filter(([_, stats]) => stats.group === group)
        .reduce((sum, [_, stats]) => sum + stats.count, 0);
      
      if (groupResourceCount === 0) return null;
      
      return {
        id: `group-${group}`,
        name: group,
        nodeType: 'resource-group',
        resourceCount: groupResourceCount,
        layerName: 'ResourceGroups',
        measure: {
          name: '资源数',
          value: groupResourceCount,
          formattedValue: groupResourceCount,
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
      
      return {
        id: `edge-karmada-control-plane-${node!.id}`,
        source: 'karmada-control-plane',
        target: node!.id,
        resourceGroup: group,
        measure: {
          name: '资源数',
          value: node!.resourceCount,
          formattedValue: node!.resourceCount,
          formattedUnit: '个',
        },
        data: {
          type: 'split',
          ratio: node!.resourceCount / (nodeResourceCount['karmada-control-plane'] || 1),
          group,
        },
        style: {
          stroke: `l(0) 0:${colorScheme.nodeColors.controlPlane} 0.5:#7EC2F3 1:${groupColor}`,
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
        
        groupToMemberEdges.push({
          id: `edge-${groupNode}-${edge.target}`,
          source: groupNode,
          target: edge.target,
          resourceGroup: edge.resourceGroup,
          resourceTypes: edge.resourceTypes,
          counts: edge.counts,
          measure: edge.measure,
          data: {
            type: 'proportion',
            ratio: edge.measure.value / nodeData.resourceCount,
            group: edge.resourceGroup,
          },
          style: {
            stroke: `l(0) 0:${colorScheme.resourceGroups[edge.resourceGroup as ResourceGroupType].color} 0.5:#7EC2F3 1:${colorScheme.nodeColors.member}`,
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
    return data.resourceDist.map(item => ({
      key: item.resourceType,
      resourceType: item.resourceType,
      resourceGroup: getResourceGroup(item.resourceType),
      clusterDist: item.clusterDist,
      totalCount: item.clusterDist.reduce((sum, cluster) => sum + cluster.count, 0),
      clusterCount: new Set(item.clusterDist.map(c => c.clusterName)).size,
    }));
  }, [data]);

  // 类型记录，用于表格过滤
  type ResourceRecord = {
    key: string;
    resourceType: string;
    resourceGroup: ResourceGroupType;
    clusterDist: any[];
    totalCount: number;
    clusterCount: number;
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

  // 检测图表容器大小变化，在需要时调整图表大小
  useEffect(() => {
    if (!graphRef.current || !graphContainerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (graphRef.current && !isDestroyed.current) {
        try {
          const graph = graphRef.current;
          // 检查图表是否有效
          if (typeof graph.destroyed === 'boolean' && !graph.destroyed && typeof graph.resize === 'function') {
            // 容器大小变化时调整图表大小
            graph.resize();
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

  // 如果没有数据，显示空状态
  if (!data && !loading) {
    return (
      <Card 
        title={i18nInstance.t('b50ac8089a3096636ae1aa7e5a61d80b', '集群调度预览')} 
        bordered={false} 
        className="shadow-sm"
        styles={{ body: { padding: '24px' } }}
      >
        <Empty description={i18nInstance.t('85db55baab6a80756102fc75d1972dc9', '暂无调度数据')} />
      </Card>
    );
  }

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

  // 垂直图例组件
  const VerticalLegend = () => (
    <div className="vertical-legend">
      <div className="text-center mb-2">
        <Text type="secondary" className="text-sm font-medium">
          {i18nInstance.t('d5d5d1f16ece92ab99b4dcc7bb859e3b', '资源类型图例')}
        </Text>
      </div>
      {Object.entries(colorScheme.resourceGroups).map(([group, config]) => (
        <div key={`group-${group}`} className="vertical-legend-item">
          <Tag 
            color={config.color}
            style={{ 
              marginBottom: '4px', 
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
      ))}
    </div>
  );

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
                              onClick={toggleGraphLock}
                              className="graph-lock-button"
                              title={isGraphLocked ? "图表已锁定，点击解锁" : "图表未锁定，点击锁定"}
                            />
                            
                            {/* 锁定覆盖层 */}
                            {isGraphLocked && (
                              <div className="graph-lock-overlay">
                                <Text type="secondary" strong style={{ fontSize: '14px' }}>
                                  图表已锁定，点击右上角按钮解锁
                                </Text>
                              </div>
                            )}
                            
                            <div className="flow-chart-wrapper">
                              {flowData.nodes.length > 0 && flowData.edges.length > 0 && !isGraphLocked ? (
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
                                        size: [150, 70],
                                      },
                                    }}
                                    edge={{
                                      style: {
                                        labelText: (d: any) => {
                                          const { type, ratio } = d.data;
                                          const text = type === 'split' ? '分流' : '占比';
                                          const percentage = (Number(ratio) * 100).toFixed(1);
                                          return `${text} ${percentage}%`;
                                        },
                                        labelBackground: true,
                                        labelFontSize: 12,
                                        opacity: 0.8,
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
                                        minLineWidth: 1,
                                        maxLineWidth: 12,
                                      },
                                    ]}
                                    layout={{
                                      type: 'antv-dagre',
                                      nodesep: 30,
                                      ranksep: 80,
                                      controlPoints: true,
                                    }}
                                    onReady={(graph) => {
                                      console.log('图表实例创建:', !!graph);
                                      
                                      if (!isDestroyed.current && graph) {
                                        if (
                                          typeof graph.destroyed === 'boolean' && 
                                          !graph.destroyed && 
                                          typeof graph.destroy === 'function'
                                        ) {
                                          // 保存有效的图表实例引用
                                          graphRef.current = graph;
                                          
                                          // 尝试缩放图表以适应容器
                                          if (typeof graph.fitCenter === 'function') {
                                            setTimeout(() => {
                                              graph.fitCenter();
                                            }, 300);
                                          }
                                        }
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
                                  {isGraphLocked ? (
                                    <div style={{ textAlign: 'center' }}>
                                      <LockOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                                      <div>图表已锁定，点击右上角按钮解锁</div>
                                    </div>
                                  ) : (
                                    <>
                                      <Spin size="large" />
                                      <div style={{ marginTop: '12px' }}>加载图表中...</div>
                                    </>
                                  )}
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
                              width: 180,
                              filters: Object.entries(colorScheme.resourceGroups).map(([group]) => ({
                                text: group,
                                value: group,
                                key: `filter-${group}`,
                              })),
                              onFilter: (value: any, record: ResourceRecord) => record.resourceGroup === value,
                              render: (text, record) => (
                                <Space direction="vertical" size={0}>
                                  <Badge
                                    color={getResourceColor(text)}
                                    text={<span style={{ fontWeight: 'bold' }}>{text}</span>}
                                  />
                                  <Tag 
                                    color={getGroupColor(record.resourceGroup)} 
                                    style={{ fontSize: '0.7rem', marginLeft: '16px', marginTop: '4px' }}
                                  >
                                    {record.resourceGroup}
                                  </Tag>
                                </Space>
                              ),
                            },
                            {
                              title: i18nInstance.t('9db64fc5139a9a43a5f3e8ae8f7f3cb1', '总数量'),
                              dataIndex: 'totalCount',
                              key: 'totalCount',
                              width: 100,
                              sorter: (a: ResourceRecord, b: ResourceRecord) => a.totalCount - b.totalCount,
                              render: (text) => (
                                <span style={{ 
                                  fontWeight: 'bold', 
                                  color: '#fff',
                                  backgroundColor: '#ff9800',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '16px',
                                  display: 'inline-block'
                                }}>
                                  {text}
                                </span>
                              )
                            },
                            {
                              title: i18nInstance.t('3b5c24a09f316f42b0ac3ced25968959', '集群覆盖'),
                              dataIndex: 'clusterCount',
                              key: 'clusterCount',
                              width: 120,
                              sorter: (a: ResourceRecord, b: ResourceRecord) => a.clusterCount - b.clusterCount,
                              render: (text, record) => (
                                <Tooltip 
                                  title={`${text}/${data.summary.totalClusters} ${i18nInstance.t('c35a681d41a9dcd9217e1bc21e5c808c', '集群')}`}
                                >
                                  <div>
                                    <div style={{ 
                                      fontWeight: 'bold',
                                      fontSize: '16px',
                                      backgroundColor: '#f0f7ff',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      marginBottom: '4px',
                                      textAlign: 'center',
                                      color: '#1890ff'
                                    }}>
                                      {text}/{data.summary.totalClusters}
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 mt-1" style={{ background: '#f0f0f0' }}>
                                      <div 
                                        className="h-3 rounded-full" 
                                        style={{ 
                                          width: `${Math.round((text / data.summary.totalClusters) * 100)}%`,
                                          background: getResourceColor(record.resourceType),
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </Tooltip>
                              ),
                            },
                            {
                              title: i18nInstance.t('5e2f637c8c3bc68437b8209e6df87ad9', '集群分布'),
                              dataIndex: 'clusterDist',
                              key: 'clusterDist',
                              render: (clusterDist) => (
                                <div className="flex flex-wrap gap-2">
                                  {clusterDist.map((cluster: any, index: number) => (
                                    <Tooltip
                                      key={`cluster-tooltip-${cluster.clusterName}-${index}`}
                                      title={`${cluster.clusterName}: ${cluster.count}`}
                                    >
                                      <Badge
                                        key={`cluster-badge-${cluster.clusterName}-${index}`}
                                        count={cluster.count}
                                        style={{ 
                                          backgroundColor: '#ff9800',
                                          marginRight: '3px'
                                        }}
                                      >
                                        <span className="px-2 py-1 rounded" style={{ 
                                          background: '#fff6e6', 
                                          fontSize: '12px',
                                          border: '1px solid #ffcc80'
                                        }}>
                                          {cluster.clusterName}
                                        </span>
                                      </Badge>
                                    </Tooltip>
                                  ))}
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