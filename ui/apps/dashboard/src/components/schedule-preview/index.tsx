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
import { Card, Empty, Spin, Tabs, Table, Badge, Statistic, Row, Col, Tooltip, Space, Tag, Progress, Alert } from 'antd';
import { FlowDirectionGraph } from '@ant-design/graphs';
import i18nInstance from '@/utils/i18n';
import { useMemo, useRef, useEffect, useState } from 'react';
import insertCss from 'insert-css';
import ErrorBoundary from '@/components/error-boundary';

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
  
  /* 流向图节点样式 */
  .resource-flow-node {
    width: calc(100% - 32px);
    height: calc(100% - 32px);
    background-color: #f6f7f9;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.12), 0 2px 4px 0 rgba(0, 0, 0, 0.1);
    box-sizing: content-box;
  }

  .resource-flow-node-name {
    font-size: 16px;
    font-weight: bold;
    color: #252525;
    margin-bottom: 8px;
  }

  .resource-flow-node-metric {
    font-size: 12px;
    color: #666666;
    display: flex;
    justify-content: space-between;
  }

  .resource-flow-node-metric--value {
    font-weight: bold;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
`);

interface SchedulePreviewProps {
  data?: SchedulePreviewResponse;
  loading: boolean;
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
            {data.resourceCount} {i18nInstance.t('ca3c5f0304a60ce1abe05ec67f28dbde', '个资源')}
          </div>
        )}
      </div>
    </div>
  );
};

const SchedulePreview: React.FC<SchedulePreviewProps> = ({ data, loading }) => {
  // 添加图表引用
  const graphRef = useRef<any>(null);
  
  // 添加状态来跟踪图表是否已经被销毁
  const isDestroyed = useRef(false);
  
  // 添加状态控制图表是否应该被渲染
  const [shouldRenderGraph, setShouldRenderGraph] = useState(false);
  
  // 添加状态跟踪渲染错误
  const [renderError, setRenderError] = useState(false);
  
  // 添加图表容器引用
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // 准备流向图的数据
  const flowData = useMemo(() => {
    if (!data || !data.nodes || !data.links || data.nodes.length === 0 || data.links.length === 0) {
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
    // 设置标志表示组件正在挂载
    isDestroyed.current = false;
    setRenderError(false);
    
    // 先确保组件完全挂载
    const timer = setTimeout(() => {
      if (!isDestroyed.current) {
        setShouldRenderGraph(true);
      }
    }, 300); // 增加延迟时间，确保DOM完全就绪
    
    return () => {
      // 设置标志表示组件已卸载
      isDestroyed.current = true;
      
      // 清除定时器
      clearTimeout(timer);
      
      // 在卸载前立即设置不渲染图表
      setShouldRenderGraph(false);
      
      // 确保清理图表实例
      if (graphRef.current) {
        try {
          const graph = graphRef.current;
          graphRef.current = null; // 先清空引用，防止重复销毁
          setTimeout(() => {
            try {
              graph.destroy();
            } catch (e) {
              console.warn('清理图表实例时出错:', e);
            }
          }, 0);
        } catch (e) {
          console.warn('访问图表实例时出错:', e);
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
        // 尝试使用数据更新图表而不是重新渲染
        graphRef.current.changeData(flowData);
      } catch (e) {
        console.warn('更新图表数据时出错:', e);
        // 发生错误时，标记渲染错误，防止后续尝试更新
        setRenderError(true);
        
        // 尝试清理损坏的图表实例
        try {
          const graph = graphRef.current;
          graphRef.current = null;
          if (graph) {
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
          // 容器大小变化时调整图表大小
          graphRef.current.resize();
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

  return (
    <Spin spinning={loading}>
      <Card 
        title={i18nInstance.t('b50ac8089a3096636ae1aa7e5a61d80b', '集群调度预览')} 
        bordered={false} 
        className="shadow-sm"
        styles={{ 
          body: { padding: '24px' },
          title: { fontSize: '18px', fontWeight: 'bold' }
        }}
        extra={
          <div className="text-sm text-gray-500">
            {i18nInstance.t('0b0f99f1cda7cd1a01a9ec7b71a13eb3', '实时展示资源在集群间的分布情况')}
          </div>
        }
      >
        {data && (
          <>
            {/* 统计信息 */}
            <Row gutter={16} className="mb-6">
              <Col span={8} key="cluster-count">
                <Statistic 
                  title={i18nInstance.t('87c606f3c5912e85c0d357c9fce5e54f', '集群数量')} 
                  value={data.summary.totalClusters} 
                  valueStyle={{ color: colorScheme.nodeColors.member, fontSize: '24px' }}
                />
              </Col>
              <Col span={8} key="propagation-policy">
                <Statistic 
                  title={i18nInstance.t('3c00dd2d7abfc8f8bf12bf9be6cb49a5', '传播策略')} 
                  value={data.summary.totalPropagationPolicy} 
                  valueStyle={{ color: colorScheme.resourceGroups.Network.color, fontSize: '24px' }}
                />
              </Col>
              <Col span={8} key="resource-binding">
                <Statistic 
                  title={i18nInstance.t('dfa4c3b0aad87e9e7ba5a0623ec2c3d3', '资源绑定')} 
                  value={data.summary.totalResourceBinding} 
                  valueStyle={{ color: colorScheme.resourceGroups.Workloads.color, fontSize: '24px' }}
                />
              </Col>
            </Row>

            <Tabs
              items={[
                {
                  key: 'flowChart',
                  label: i18nInstance.t('8a8b80cb1b0ac7e0463aa13840a1b17c', '调度流向图'),
                  children: (
                    <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '16px' }}>
                      {flowData.nodes.length > 0 && flowData.edges.length > 0 ? (
                        <>
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-2 justify-center mb-2">
                              <div className="text-center w-full mb-2">
                                <span className="text-sm text-gray-500">{i18nInstance.t('d5d5d1f16ece92ab99b4dcc7bb859e3b', '资源类型图例')}</span>
                              </div>
                              {Object.entries(colorScheme.resourceGroups).map(([group, config]) => (
                                <Tag 
                                  key={`group-${group}`} 
                                  color={config.color}
                                  style={{ 
                                    marginRight: '8px', 
                                    fontSize: '13px', 
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                  }}
                                >
                                  {group}
                                </Tag>
                              ))}
                            </div>
                          </div>
                          <div 
                            ref={graphContainerRef}
                            style={{ 
                              background: '#fff', 
                              borderRadius: '12px', 
                              padding: '16px',
                              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                              position: 'relative',
                              overflow: 'hidden',
                              height: '520px',
                              border: '1px solid rgba(0,0,0,0.05)'
                            }}
                          >
                            {shouldRenderGraph && !renderError && flowData.nodes.length > 0 && (
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
                                  autoFit="view"
                                  padding={120}
                                  data={flowData as any}
                                  node={{
                                    style: {
                                      component: (data: any) => <ResourceFlowNode data={data} />,
                                      size: [180, 90],
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
                                      maxLineWidth: 24,
                                    },
                                  ]}
                                  layout={{
                                    type: 'antv-dagre',
                                    nodesep: 50,
                                    ranksep: 120,
                                  }}
                                  onReady={(graph) => {
                                    if (!isDestroyed.current) {
                                      // 只有在组件还未被销毁时才保存图表实例
                                      graphRef.current = graph;
                                    } else if (graph) {
                                      // 如果组件已被销毁但图表实例仍被创建，则直接销毁它
                                      try {
                                        graph.destroy();
                                      } catch (e) {
                                        console.warn('图表实例创建后立即销毁出错:', e);
                                      }
                                    }
                                  }}
                                />
                              </ErrorBoundary>
                            )}
                            {(!shouldRenderGraph || renderError) && (
                              <div 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  height: '100%',
                                  color: '#999'
                                }}
                              >
                                {renderError ? (
                                  <Alert
                                    message="图表渲染失败"
                                    description="无法加载流向图，请刷新页面重试。"
                                    type="error"
                                    showIcon
                                  />
                                ) : (
                                  <Spin tip="加载图表中..." />
                                )}
                              </div>
                            )}
                          </div>
                        </>
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
                  children: (
                    <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '16px' }}>
                      <Table
                        dataSource={resourceDistData}
                        pagination={false}
                        size="middle"
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
                              <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
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
                                  <div style={{ fontWeight: 'bold' }}>
                                    {text}/{data.summary.totalClusters}
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1" style={{ background: '#f0f0f0' }}>
                                    <div 
                                      className="h-2 rounded-full" 
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
                                        backgroundColor: colorScheme.nodeColors.member,
                                        marginRight: '3px'
                                      }}
                                    >
                                      <span className="px-2 py-1 rounded" style={{ 
                                        background: '#f0f0f0', 
                                        fontSize: '12px',
                                        border: '1px solid #e8e8e8'
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