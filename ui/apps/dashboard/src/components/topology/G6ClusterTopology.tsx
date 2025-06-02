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

import React, { useEffect, useRef, useState } from 'react';
import { Typography, Card, Spin } from 'antd';
import { ClusterOutlined } from '@ant-design/icons';
import { Graph, treeToGraphData } from '@antv/g6';
import { GetMemberClusterNodes, ClusterNode } from '@/services/cluster';

const { Text } = Typography;

interface ClusterData {
  objectMeta: { 
    name: string;
    creationTimestamp?: string;
  };
  ready: boolean;
  kubernetesVersion: string;
  syncMode: string;
  nodeSummary: {
    totalNum: number;
    readyNum: number;
  };
  allocatedResources: {
    cpuCapacity: number;
    cpuFraction: number;
    memoryCapacity: number;
    memoryFraction: number;
    allocatedPods: number;
    podCapacity: number;
    podFraction?: number;
  };
}

interface G6ClusterTopologyProps {
  clusterListData: {
    clusters: ClusterData[];
  } | null | undefined;
  isLoading: boolean;
}

// 图片缓存对象
const imageCache: { [key: string]: HTMLImageElement } = {};

const G6ClusterTopology: React.FC<G6ClusterTopologyProps> = ({ 
  clusterListData, 
  isLoading 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [clusterNodes, setClusterNodes] = useState<Record<string, ClusterNode[]>>({});
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(400);

  /**
   * 预加载图片
   */
  const preloadImages = async () => {
    const imageConfigs = [
      { key: 'karmada', src: '/Karmada.png' },
      { key: 'cluster', src: '/cluster.png' },
      { key: 'node', src: '/node.png' }
    ];

    try {
      const loadPromises = imageConfigs.map(config => {
        return new Promise<void>((resolve, reject) => {
          if (imageCache[config.key]) {
            resolve();
            return;
          }

          const img = new Image();
          img.onload = () => {
            imageCache[config.key] = img;
            resolve();
          };
          img.onerror = reject;
          img.src = config.src;
        });
      });

      await Promise.all(loadPromises);
      setImagesLoaded(true);
    } catch (error) {
      console.warn('图片加载失败，将使用默认图标', error);
      setImagesLoaded(true); // 即使失败也继续渲染，使用备用方案
    }
  };

  /**
   * 获取集群的节点详情
   */
  const fetchClusterNodes = async (clusterName: string) => {
    if (clusterNodes[clusterName] || loadingNodes.has(clusterName)) {
      return;
    }

    setLoadingNodes(prev => new Set(prev).add(clusterName));
    
    try {
      const response = await GetMemberClusterNodes({ clusterName });
      if (response.data?.nodes) {
        setClusterNodes(prev => ({
          ...prev,
          [clusterName]: response.data.nodes
        }));
      }
    } catch (error) {
      console.warn(`获取集群 ${clusterName} 节点信息失败:`, error);
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(clusterName);
        return newSet;
      });
    }
  };

  /**
   * 获取节点状态
   */
  const getNodeStatus = (node: ClusterNode): 'ready' | 'notReady' => {
    const readyCondition = node.status?.conditions?.find(
      condition => condition.type === 'Ready'
    );
    return readyCondition?.status === 'True' ? 'ready' : 'notReady';
  };

  /**
   * 获取节点角色
   */
  const getNodeRoles = (node: ClusterNode): string[] => {
    const roles: string[] = [];
    const labels = node.objectMeta.labels || {};
    
    if (labels['node-role.kubernetes.io/control-plane'] === 'true' || 
        labels['node-role.kubernetes.io/master'] === 'true') {
      roles.push('control-plane');
    }
    if (labels['node-role.kubernetes.io/etcd'] === 'true') {
      roles.push('etcd');
    }
    if (roles.length === 0) {
      roles.push('worker');
    }
    
    return roles;
  };

  /**
   * 格式化资源量
   */
  const formatResource = (value: string): { value: number; unit: string } => {
    if (!value || value === '0' || value === '') {
      return { value: 0, unit: '' };
    }
    
    // 处理CPU资源 (例如: "2000m" -> 2 cores, "2" -> 2 cores)
    if (value.endsWith('m')) {
      return { value: parseInt(value.slice(0, -1)) / 1000, unit: 'cores' };
    }
    
    // 处理内存资源
    if (value.endsWith('Ki')) {
      return { value: parseInt(value.slice(0, -2)) / (1024 * 1024), unit: 'GB' };
    }
    if (value.endsWith('Mi')) {
      return { value: parseInt(value.slice(0, -2)) / 1024, unit: 'GB' };
    }
    if (value.endsWith('Gi')) {
      return { value: parseInt(value.slice(0, -2)), unit: 'GB' };
    }
    if (value.endsWith('Ti')) {
      return { value: parseInt(value.slice(0, -2)) * 1024, unit: 'GB' };
    }
    
    // 处理纯数字 (CPU cores)
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return { value: numValue, unit: 'cores' };
    }
    
    return { value: 0, unit: '' };
  };

  /**
   * 判断节点是否为叶子节点
   * @param d - 节点数据
   * @returns 是否为叶子节点
   */
  const isLeafNode = (d: any) => {
    return !d.children || d.children.length === 0;
  };

  /**
   * 获取节点图标
   * @param type - 节点类型
   * @returns 图标配置
   */
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'control-plane':
        return imageCache['karmada'] ? {
          type: 'image',
          src: imageCache['karmada'].src,
          width: 60,
          height: 60
        } : {
          type: 'text',
          text: '🎛️',
          fontSize: 24
        };
      case 'cluster':
        return imageCache['cluster'] ? {
          type: 'image', 
          src: imageCache['cluster'].src,
          width: 42,
          height: 42
        } : {
          type: 'text',
          text: '🗂️',
          fontSize: 20
        };
      case 'worker-node':
        return imageCache['node'] ? {
          type: 'image',
          src: imageCache['node'].src,
          width: 30,
          height: 30
        } : {
          type: 'text',
          text: '🖥️',
          fontSize: 16
        };
      default:
        return {
          type: 'text',
          text: '📦',
          fontSize: 18
        };
    }
  };

  const transformClusterDataToTree = (clusters: ClusterData[]) => {
    return {
      id: 'karmada-control-plane',
      data: {
        type: 'control-plane',
        name: 'Karmada 控制平面',
        status: 'ready',
        totalClusters: clusters.length
      },
      children: clusters.map((cluster) => {
        const clusterName = cluster.objectMeta.name;
        const nodes = clusterNodes[clusterName] || [];
        
        // 如果还没有获取到节点数据，懒加载获取
        if (nodes.length === 0 && !loadingNodes.has(clusterName)) {
          fetchClusterNodes(clusterName);
        }

        return {
          id: clusterName,
          data: {
            type: 'cluster',
            name: clusterName,
            status: cluster.ready ? 'ready' : 'notReady',
            version: cluster.kubernetesVersion,
            syncMode: cluster.syncMode,
            nodeCount: cluster.nodeSummary.totalNum,
            readyNodes: cluster.nodeSummary.readyNum,
            // 集群资源使用情况 - 使用原始分数值，在显示时再转换为百分比
            cpuFraction: cluster.allocatedResources?.cpuFraction || 0,
            memoryFraction: cluster.allocatedResources?.memoryFraction || 0,
            podFraction: cluster.allocatedResources?.podFraction || 0,
            allocatedPods: cluster.allocatedResources?.allocatedPods || 0,
            podCapacity: cluster.allocatedResources?.podCapacity || 0
          },
          children: nodes.length > 0 ? nodes.map((node) => ({
            id: `${clusterName}-${node.objectMeta.name}`,
            data: {
              type: 'worker-node',
              name: node.objectMeta.name,
              status: getNodeStatus(node),
              parentCluster: clusterName,
              version: cluster.kubernetesVersion,
              nodeDetail: node,
              roles: getNodeRoles(node),
              internalIP: node.status?.addresses?.find(addr => addr.type === 'InternalIP')?.address,
              hostname: node.status?.addresses?.find(addr => addr.type === 'Hostname')?.address,
              cpuCapacity: node.status?.capacity?.cpu,
              memoryCapacity: node.status?.capacity?.memory,
              podsCapacity: node.status?.capacity?.pods,
              cpuAllocatable: node.status?.allocatable?.cpu,
              memoryAllocatable: node.status?.allocatable?.memory,
              podsAllocatable: node.status?.allocatable?.pods,
              // 传递resourceSummary数据（如果存在）
              resourceSummary: node.resourceSummary
            }
          })) : Array.from({ length: cluster.nodeSummary.totalNum }, (_, index) => ({
            id: `${clusterName}-loading-node-${index + 1}`,
            data: {
              type: 'worker-node',
              name: `加载中...`,
              status: 'loading',
              parentCluster: clusterName,
              version: cluster.kubernetesVersion
            }
          }))
        };
      })
    };
  };

  const initGraph = () => {
    if (!containerRef.current || !clusterListData?.clusters || !imagesLoaded) return;

    // 清除之前的图
    if (graphRef.current) {
      graphRef.current.destroy();
    }

    const treeData = transformClusterDataToTree(clusterListData.clusters);
    
    // 默认选择控制平面节点
    if (!selectedNode) {
      setSelectedNode(treeData.data);
    }
    
    const graph = new Graph({
      container: containerRef.current,
      autoFit: 'view',
      data: treeToGraphData(treeData),
      node: {
        style: {
          labelText: (d: any) => {
            const data = d.data;
            if (!data) return d.id;
            
            // 根据节点类型生成不同的标签内容 - 只显示名称
            switch (data.type) {
              case 'control-plane':
                return `${data.name}`;
              case 'cluster':
                return `${data.name}`;
              case 'worker-node':
                return `${data.name}`;
              default:
                return data.name || d.id;
            }
          },
          labelPlacement: (d: any) => (isLeafNode(d) ? 'right' : 'left'),
          labelBackground: true,
          labelBackgroundFill: 'rgba(255, 255, 255, 0.95)',
          labelBackgroundRadius: 6,
          labelPadding: [6, 10],
          labelFill: '#333',
          labelFontSize: (d: any) => {
            switch (d.data?.type) {
              case 'control-plane': return 14;
              case 'cluster': return 12;
              case 'worker-node': return 11;
              default: return 12;
            }
          },
          labelFontWeight: (d: any) => {
            return d.data?.type === 'control-plane' ? 'bold' : 'normal';
          },
          labelLineHeight: 1.2,
          labelMaxLines: (d: any) => {
            switch (d.data?.type) {
              case 'control-plane': return 1;
              case 'cluster': return 1;
              case 'worker-node': return 1;
              default: return 1;
            }
          },
          size: (d: any) => {
            switch (d.data?.type) {
              case 'control-plane': return 70;
              case 'cluster': return 50;
              case 'worker-node': return 35;
              default: return 40;
            }
          },
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          iconSrc: (d: any) => {
            const iconConfig = getNodeIcon(d.data?.type);
            return iconConfig.type === 'image' ? iconConfig.src : undefined;
          },
          iconWidth: (d: any) => {
            const iconConfig = getNodeIcon(d.data?.type);
            return iconConfig.type === 'image' ? iconConfig.width : undefined;
          },
          iconHeight: (d: any) => {
            const iconConfig = getNodeIcon(d.data?.type);
            return iconConfig.type === 'image' ? iconConfig.height : undefined;
          },
          iconText: (d: any) => {
            const iconConfig = getNodeIcon(d.data?.type);
            return iconConfig.type === 'text' ? iconConfig.text : undefined;
          },
          iconFontSize: (d: any) => {
            const iconConfig = getNodeIcon(d.data?.type);
            return iconConfig.type === 'text' ? iconConfig.fontSize : undefined;
          },
          halo: false,
          ports: [{ placement: 'right' }, { placement: 'left' }],
        },
        animation: {
          enter: [
            {
              fields: ['opacity'],
              duration: 1000,
              delay: 0,
            },
            {
              fields: ['transform'],
              duration: 800,
              easing: 'ease-back-out',
              delay: 200,
            }
          ],
        },
      },
      edge: {
        type: 'cubic-horizontal',
        style: {
          stroke: (d: any) => {
            const targetData = d.target?.data;
            if (targetData?.type === 'control-plane') return '#1890ff';
            if (targetData?.type === 'cluster') return '#13c2c2';
            if (targetData?.type === 'worker-node') {
              return targetData.status === 'ready' ? '#52c41a' : targetData.status === 'loading' ? '#faad14' : '#ff4d4f';
            }
            return '#8c8c8c';
          },
          strokeWidth: 2,
          strokeOpacity: 0.8,
          lineDash: [0],
        },
        animation: {
          enter: [
            {
              fields: ['strokeOpacity'],
              duration: 1500,
              delay: 800,
            }
          ],
        },
      },
      layout: {
        type: 'dendrogram',
        direction: 'LR',
        nodeSep: 60,
        rankSep: 250,
      },
      behaviors: [
        'drag-canvas', 
        'zoom-canvas', 
        {
          type: 'drag-element',
          enableTransient: false,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
          onlyChangeComboSize: false,
          shouldBegin: (evt: any) => {
            // 只有在按住 Ctrl 键时才允许拖拽节点
            return evt.ctrlKey || evt.metaKey;
          },
        },
        'collapse-expand',
        {
          type: 'hover-activate',
          degree: 1,
          inactiveState: 'inactive',
          activeState: 'active',
          shouldUpdate: (evt: any) => {
            // 在拖拽时不触发hover效果
            return !evt.target?.graph?.isDragging;
          },
        }
      ],
    });

    graph.render();
    
    // 添加节点点击事件
    graph.on('node:click', (evt: any) => {
      console.log('=== Node Click Event ===');
      console.log('Full event:', evt);
      console.log('Event type:', evt.type);
      console.log('Event itemType:', evt.itemType);
      console.log('Event itemId:', evt.itemId);
      console.log('Event target:', evt.target);
      
      // 尝试多种方式获取节点数据
      let nodeData = null;
      let nodeId = null;
      
      // 获取节点ID
      if (evt.itemId) {
        nodeId = evt.itemId;
      } else if (evt.target?.id) {
        nodeId = evt.target.id;
      }
      
      console.log('Node ID:', nodeId);
      
      if (nodeId) {
        // 通过图实例获取节点数据
        try {
          const nodeModel = graph.getNodeData(nodeId);
          console.log('Node model from graph:', nodeModel);
          nodeData = nodeModel?.data || nodeModel;
        } catch (error) {
          console.warn('Error getting node data from graph:', error);
        }
      }
      
      // 如果上面的方法失败，尝试其他方式
      if (!nodeData) {
        // 方式1: 从事件目标获取
        if (evt.target?.model?.data) {
          nodeData = evt.target.model.data;
          console.log('Got data from evt.target.model.data');
        }
        // 方式2: 从事件目标直接获取
        else if (evt.target?.data) {
          nodeData = evt.target.data;
          console.log('Got data from evt.target.data');
        }
        // 方式3: 从item获取
        else if (evt.item) {
          const model = evt.item.getModel();
          nodeData = model?.data || model;
          console.log('Got data from evt.item.getModel()');
        }
      }
      
      console.log('Final node data:', nodeData);
      console.log('Node data type:', nodeData?.type);
      console.log('Node data name:', nodeData?.name);
      console.log('=== End Node Click Event ===');
      
      if (nodeData) {
        console.log('✅ Setting selected node:', nodeData);
        setSelectedNode(nodeData);
        setShowSidebar(true);
      } else {
        console.warn('❌ No node data found in click event');
        // 作为备用方案，如果有nodeId，创建一个基本的节点数据
        if (nodeId) {
          console.log('🔄 Creating fallback node data for:', nodeId);
          const fallbackData = {
            type: nodeId.includes('control-plane') ? 'control-plane' : 
                  nodeId.includes('loading-node') ? 'worker-node' : 'cluster',
            name: nodeId,
            id: nodeId
          };
          setSelectedNode(fallbackData);
          setShowSidebar(true);
        }
      }
    });
    
    graphRef.current = graph;
  };

  /**
   * 生成侧边栏内容
   */
  const generateSidebarContent = (data: any) => {
    if (!data) return null;

    if (data?.type === 'control-plane') {
      const readyClusters = clusterListData?.clusters?.filter((c: ClusterData) => c.ready).length || 0;
      const totalNodes = clusterListData?.clusters?.reduce((sum: number, c: ClusterData) => sum + c.nodeSummary.totalNum, 0) || 0;
      const readyNodes = clusterListData?.clusters?.reduce((sum: number, c: ClusterData) => sum + c.nodeSummary.readyNum, 0) || 0;
      const totalPods = clusterListData?.clusters?.reduce((sum: number, c: ClusterData) => sum + c.allocatedResources.allocatedPods, 0) || 0;
      
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/Karmada.png" style={{ width: '28px', height: '28px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>🎛️ Karmada 控制平面</Text>
          </div>
          
          <Card size="small" style={{ marginBottom: '12px', background: 'rgba(24, 144, 255, 0.1)' }}>
            <Text strong style={{ color: '#69c0ff' }}>📊 系统概览</Text>
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>版本:</span>
                <Text strong style={{ color: '#91d5ff' }}>v1.13.2</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>API版本:</span>
                <Text style={{ color: '#91d5ff' }}>v1alpha1</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>运行时间:</span>
                <Text style={{ color: '#91d5ff' }}>7天8小时</Text>
              </div>
            </div>
          </Card>

          <Card size="small" style={{ marginBottom: '12px', background: 'rgba(82, 196, 26, 0.1)' }}>
            <Text strong style={{ color: '#95de64' }}>🏗️ 集群管理</Text>
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>管理集群总数:</span>
                <Text strong style={{ color: '#b7eb8f' }}>{data.totalClusters}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>健康集群:</span>
                <Text strong style={{ color: '#52c41a' }}>{readyClusters}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>异常集群:</span>
                <Text strong style={{ color: data.totalClusters - readyClusters > 0 ? '#ff4d4f' : '#52c41a' }}>{data.totalClusters - readyClusters}</Text>
              </div>
            </div>
          </Card>

          <Card size="small" style={{ background: 'rgba(19, 194, 194, 0.1)' }}>
            <Text strong style={{ color: '#5cdbd3' }}>🖥️ 资源统计</Text>
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>节点总数:</span>
                <Text strong style={{ color: '#87e8de' }}>{totalNodes}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>就绪节点:</span>
                <Text strong style={{ color: '#52c41a' }}>{readyNodes}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>运行Pod数:</span>
                <Text strong style={{ color: '#87e8de' }}>{totalPods}</Text>
              </div>
            </div>
          </Card>
        </div>
      );
    } else if (data?.type === 'cluster') {
      const cluster = clusterListData?.clusters?.find(c => c.objectMeta.name === data.name);
      
      // 修正资源使用率计算 - API返回的fraction已经是百分比，不需要乘以100
      const cpuUsagePercent = cluster?.allocatedResources?.cpuFraction || 0;
      const memoryUsagePercent = cluster?.allocatedResources?.memoryFraction || 0;
      const podCapacity = cluster?.allocatedResources?.podCapacity || 0;
      const allocatedPods = cluster?.allocatedResources?.allocatedPods || 0;
      const podUsagePercent = cluster?.allocatedResources?.podFraction || 0;
      
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/cluster.png" style={{ width: '26px', height: '26px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#13c2c2' }}>🏗️ 集群: {data.name}</Text>
          </div>
          
          <Card size="small" style={{ marginBottom: '12px', background: 'rgba(19, 194, 194, 0.1)' }}>
            <Text strong style={{ color: '#5cdbd3' }}>📋 基本信息</Text>
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>状态:</span>
                <Text strong style={{ color: data.status === 'ready' ? '#52c41a' : '#ff4d4f' }}>
                  {data.status === 'ready' ? '🟢 Ready' : '🔴 NotReady'}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Kubernetes版本:</span>
                <Text strong style={{ color: '#87e8de' }}>{data.version}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>同步模式:</span>
                <Text strong style={{ color: data.syncMode === 'Push' ? '#52c41a' : '#faad14' }}>
                  {data.syncMode === 'Push' ? '⬆️ Push' : '⬇️ Pull'}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', flexWrap: 'wrap' }}>
                <span>创建时间:</span>
                <Text style={{ color: '#87e8de', textAlign: 'right', maxWidth: '200px', wordBreak: 'break-all' }}>
                  {cluster?.objectMeta?.creationTimestamp ? new Date(cluster.objectMeta.creationTimestamp).toLocaleString('zh-CN') : 'N/A'}
                </Text>
              </div>
            </div>
          </Card>

          <Card size="small" style={{ marginBottom: '12px', background: 'rgba(82, 196, 26, 0.1)' }}>
            <Text strong style={{ color: '#95de64' }}>🖥️ 节点状态</Text>
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>节点总数:</span>
                <Text strong style={{ color: '#b7eb8f' }}>{data.nodeCount}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>就绪节点:</span>
                <Text strong style={{ color: '#52c41a' }}>{data.readyNodes}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>异常节点:</span>
                <Text strong style={{ color: data.nodeCount - data.readyNodes > 0 ? '#ff4d4f' : '#52c41a' }}>{data.nodeCount - data.readyNodes}</Text>
              </div>
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>节点健康率:</span>
                  <Text strong style={{ color: '#52c41a' }}>{((data.readyNodes / data.nodeCount) * 100).toFixed(1)}%</Text>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    background: 'linear-gradient(90deg, #52c41a, #73d13d)', 
                    height: '100%', 
                    width: `${(data.readyNodes / data.nodeCount) * 100}%`, 
                    transition: 'width 0.3s ease' 
                  }}></div>
                </div>
              </div>
            </div>
          </Card>

          <Card size="small" style={{ background: 'rgba(250, 173, 20, 0.1)' }}>
            <Text strong style={{ color: '#ffd666' }}>⚡ 资源使用率</Text>
            <div style={{ marginTop: '8px' }}>
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>CPU使用率:</span>
                  <Text strong style={{ color: cpuUsagePercent > 80 ? '#ff4d4f' : cpuUsagePercent > 60 ? '#faad14' : '#52c41a' }}>
                    {cpuUsagePercent.toFixed(1)}%
                  </Text>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    background: `linear-gradient(90deg, ${cpuUsagePercent > 80 ? '#ff4d4f' : cpuUsagePercent > 60 ? '#faad14' : '#52c41a'}, ${cpuUsagePercent > 80 ? '#ff7875' : cpuUsagePercent > 60 ? '#ffc53d' : '#73d13d'})`, 
                    height: '100%', 
                    width: `${Math.min(cpuUsagePercent, 100)}%`, 
                    transition: 'width 0.3s ease' 
                  }}></div>
                </div>
              </div>
              
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>内存使用率:</span>
                  <Text strong style={{ color: memoryUsagePercent > 80 ? '#ff4d4f' : memoryUsagePercent > 60 ? '#faad14' : '#52c41a' }}>
                    {memoryUsagePercent.toFixed(1)}%
                  </Text>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    background: `linear-gradient(90deg, ${memoryUsagePercent > 80 ? '#ff4d4f' : memoryUsagePercent > 60 ? '#faad14' : '#52c41a'}, ${memoryUsagePercent > 80 ? '#ff7875' : memoryUsagePercent > 60 ? '#ffc53d' : '#73d13d'})`, 
                    height: '100%', 
                    width: `${Math.min(memoryUsagePercent, 100)}%`, 
                    transition: 'width 0.3s ease' 
                  }}></div>
                </div>
              </div>
              
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Pod使用率:</span>
                  <Text strong style={{ color: podUsagePercent > 80 ? '#ff4d4f' : podUsagePercent > 60 ? '#faad14' : '#52c41a' }}>
                    {podUsagePercent.toFixed(1)}%
                  </Text>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    background: `linear-gradient(90deg, ${podUsagePercent > 80 ? '#ff4d4f' : podUsagePercent > 60 ? '#faad14' : '#52c41a'}, ${podUsagePercent > 80 ? '#ff7875' : podUsagePercent > 60 ? '#ffc53d' : '#73d13d'})`, 
                    height: '100%', 
                    width: `${Math.min(podUsagePercent, 100)}%`, 
                    transition: 'width 0.3s ease' 
                  }}></div>
                </div>
                <div style={{ marginTop: '2px', color: '#bbb', fontSize: '11px' }}>
                  已分配: {allocatedPods} / {podCapacity || 'N/A'} pods
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    } else if (data?.type === 'worker-node') {
      if (data.status === 'loading') {
        return (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
              <img src="/node.png" style={{ width: '20px', height: '20px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#faad14' }}>🔄 节点信息加载中...</Text>
            </div>
            <Spin size="large" />
            <div style={{ marginTop: '12px' }}>
              <Text type="secondary">正在获取 {data.parentCluster} 集群的节点详细信息...</Text>
            </div>
          </div>
        );
      }

      const node = data.nodeDetail;
      const cpuCapacity = formatResource(data.cpuCapacity || '0');
      const memoryCapacity = formatResource(data.memoryCapacity || '0Ki');
      const cpuAllocatable = formatResource(data.cpuAllocatable || '0');
      const memoryAllocatable = formatResource(data.memoryAllocatable || '0Ki');
      
      // 获取节点的系统信息
      const nodeInfo = node?.status?.nodeInfo;
      const conditions = node?.status?.conditions || [];
      const readyCondition = conditions.find((c: any) => c.type === 'Ready');
      const memoryCondition = conditions.find((c: any) => c.type === 'MemoryPressure');
      const diskCondition = conditions.find((c: any) => c.type === 'DiskPressure');
      const pidCondition = conditions.find((c: any) => c.type === 'PIDPressure');
      
      // 修正资源使用百分比计算 - 使用正确的resourceSummary字段
      // resourceSummary.utilization已经是字符串格式的百分比（如"91.9%"）
      const resourceSummary = node?.resourceSummary;
      const hasResourceData = resourceSummary != null;
      
      // 解析百分比字符串为数值（去除%符号）
      const cpuUsagePercent = hasResourceData ? 
        parseFloat(resourceSummary.cpu?.utilization?.replace('%', '') || '0') : 0;
      const memoryUsagePercent = hasResourceData ? 
        parseFloat(resourceSummary.memory?.utilization?.replace('%', '') || '0') : 0;
      const podUsagePercent = hasResourceData ? 
        parseFloat(resourceSummary.pods?.utilization?.replace('%', '') || '0') : 0;
      
      // 获取已分配的资源数量
      const allocatedPods = hasResourceData ? 
        parseInt(resourceSummary.pods?.allocated || '0') : 0;

      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/node.png" style={{ width: '26px', height: '26px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <Text style={{ fontSize: '18px', fontWeight: 'bold', color: data.status === 'ready' ? '#52c41a' : '#ff4d4f' }}>
              🖥️ {data.name}
            </Text>
          </div>
          
          <Card size="small" style={{ marginBottom: '12px', background: 'rgba(82, 196, 26, 0.1)' }}>
            <Text strong style={{ color: '#95de64' }}>📋 基本信息</Text>
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>状态:</span>
                <Text strong style={{ color: data.status === 'ready' ? '#52c41a' : '#ff4d4f' }}>
                  {data.status === 'ready' ? '🟢 Ready' : '🔴 NotReady'}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>所属集群:</span>
                <Text strong style={{ color: '#b7eb8f' }}>{data.parentCluster}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>节点角色:</span>
                <Text strong style={{ color: '#13c2c2' }}>{data.roles?.join(', ') || 'worker'}</Text>
              </div>
              {data.internalIP && (
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', flexWrap: 'wrap' }}>
                  <span>内部IP:</span>
                  <Text style={{ color: '#b7eb8f', wordBreak: 'break-all' }}>{data.internalIP}</Text>
                </div>
              )}
              {data.hostname && (
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', flexWrap: 'wrap' }}>
                  <span>主机名:</span>
                  <Text style={{ color: '#b7eb8f', wordBreak: 'break-all', maxWidth: '300px', textAlign: 'right' }}>{data.hostname}</Text>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Kubernetes版本:</span>
                <Text style={{ color: '#b7eb8f' }}>{data.version}</Text>
              </div>
            </div>
          </Card>

          {nodeInfo && (
            <Card size="small" style={{ marginBottom: '12px', background: 'rgba(24, 144, 255, 0.1)' }}>
              <Text strong style={{ color: '#69c0ff' }}>🖥️ 系统信息</Text>
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', flexWrap: 'wrap' }}>
                  <span>操作系统:</span>
                  <Text style={{ color: '#91d5ff', maxWidth: '350px', textAlign: 'right', wordBreak: 'break-all' }}>{nodeInfo.osImage || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', flexWrap: 'wrap' }}>
                  <span>内核版本:</span>
                  <Text style={{ color: '#91d5ff', maxWidth: '350px', textAlign: 'right', wordBreak: 'break-all' }}>{nodeInfo.kernelVersion || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', flexWrap: 'wrap' }}>
                  <span>容器运行时:</span>
                  <Text style={{ color: '#91d5ff', maxWidth: '350px', textAlign: 'right', wordBreak: 'break-all' }}>{nodeInfo.containerRuntimeVersion || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', flexWrap: 'wrap' }}>
                  <span>Kubelet版本:</span>
                  <Text style={{ color: '#91d5ff', maxWidth: '350px', textAlign: 'right', wordBreak: 'break-all' }}>{nodeInfo.kubeletVersion || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', flexWrap: 'wrap' }}>
                  <span>架构:</span>
                  <Text style={{ color: '#91d5ff', maxWidth: '350px', textAlign: 'right', wordBreak: 'break-all' }}>{nodeInfo.architecture || 'N/A'}</Text>
                </div>
              </div>
            </Card>
          )}

          <Card size="small" style={{ marginBottom: '12px', background: 'rgba(250, 173, 20, 0.1)' }}>
            <Text strong style={{ color: '#ffd666' }}>⚡ 资源容量</Text>
            <div style={{ marginTop: '8px' }}>
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>CPU:</span>
                  <Text strong style={{ color: '#ffd666' }}>{cpuCapacity.value.toFixed(1)} {cpuCapacity.unit}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: '#bbb' }}>
                  <span>可分配:</span>
                  <span>{cpuAllocatable.value.toFixed(1)} {cpuAllocatable.unit}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    background: cpuUsagePercent > 0 ? 'linear-gradient(90deg, #faad14, #ffc53d)' : 'rgba(255,255,255,0.2)', 
                    height: '100%', 
                    width: `${Math.max(Math.min(cpuUsagePercent, 100), 2)}%`, 
                    transition: 'width 0.3s ease',
                    minWidth: cpuUsagePercent > 0 ? 'auto' : '2px'
                  }}></div>
                </div>
                <div style={{ marginTop: '2px', color: '#bbb', fontSize: '11px' }}>
                  使用率: {hasResourceData ? `${cpuUsagePercent.toFixed(1)}%` : '数据不可用'}
                </div>
              </div>
              
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>内存:</span>
                  <Text strong style={{ color: '#ffd666' }}>{memoryCapacity.value.toFixed(1)} {memoryCapacity.unit}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: '#bbb' }}>
                  <span>可分配:</span>
                  <span>{memoryAllocatable.value.toFixed(1)} {memoryAllocatable.unit}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    background: memoryUsagePercent > 0 ? 'linear-gradient(90deg, #52c41a, #73d13d)' : 'rgba(255,255,255,0.2)', 
                    height: '100%', 
                    width: `${Math.max(Math.min(memoryUsagePercent, 100), 2)}%`, 
                    transition: 'width 0.3s ease',
                    minWidth: memoryUsagePercent > 0 ? 'auto' : '2px'
                  }}></div>
                </div>
                <div style={{ marginTop: '2px', color: '#bbb', fontSize: '11px' }}>
                  使用率: {hasResourceData ? `${memoryUsagePercent.toFixed(1)}%` : '数据不可用'}
                </div>
              </div>
              
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Pod容量:</span>
                  <Text strong style={{ color: '#ffd666' }}>{data.podsCapacity || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: '#bbb' }}>
                  <span>可分配:</span>
                  <span>{data.podsAllocatable || 'N/A'}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    background: podUsagePercent > 0 ? 'linear-gradient(90deg, #1890ff, #40a9ff)' : 'rgba(255,255,255,0.2)', 
                    height: '100%', 
                    width: `${Math.max(Math.min(podUsagePercent, 100), 2)}%`, 
                    transition: 'width 0.3s ease',
                    minWidth: podUsagePercent > 0 ? 'auto' : '2px'
                  }}></div>
                </div>
                <div style={{ marginTop: '2px', color: '#bbb', fontSize: '11px' }}>
                  {hasResourceData ? 
                    `已分配: ${allocatedPods} / ${data.podsCapacity || 'N/A'} pods (${podUsagePercent.toFixed(1)}%)` : 
                    `容量: ${data.podsCapacity || 'N/A'} pods (使用率数据不可用)`}
                </div>
              </div>
            </div>
          </Card>

          {!hasResourceData && (
            <Card size="small" style={{ marginBottom: '12px', background: 'rgba(24, 144, 255, 0.1)' }}>
              <Text strong style={{ color: '#69c0ff' }}>💡 说明</Text>
              <div style={{ marginTop: '8px' }}>
                <Text style={{ color: '#91d5ff', fontSize: '12px' }}>
                  此节点API暂不提供资源使用率数据。显示的是节点的总容量和可分配容量信息。
                  如需查看详细的资源使用情况，请通过其他监控工具（如Prometheus、Grafana）查看。
                </Text>
              </div>
            </Card>
          )}

          <Card size="small" style={{ background: 'rgba(19, 194, 194, 0.1)' }}>
            <Text strong style={{ color: '#5cdbd3' }}>🔍 健康状态</Text>
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                <span>Ready:</span>
                <Text strong style={{ color: readyCondition?.status === 'True' ? '#52c41a' : '#ff4d4f' }}>
                  {readyCondition?.status === 'True' ? '✅ True' : '❌ False'}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                <span>内存压力:</span>
                <Text strong style={{ color: memoryCondition?.status === 'False' ? '#52c41a' : '#ff4d4f' }}>
                  {memoryCondition?.status === 'False' ? '✅ 正常' : '⚠️ 有压力'}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                <span>磁盘压力:</span>
                <Text strong style={{ color: diskCondition?.status === 'False' ? '#52c41a' : '#ff4d4f' }}>
                  {diskCondition?.status === 'False' ? '✅ 正常' : '⚠️ 有压力'}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                <span>PID压力:</span>
                <Text strong style={{ color: pidCondition?.status === 'False' ? '#52c41a' : '#ff4d4f' }}>
                  {pidCondition?.status === 'False' ? '✅ 正常' : '⚠️ 有压力'}
                </Text>
              </div>
              {readyCondition?.lastTransitionTime && (
                <div style={{ margin: '8px 0 4px 0', paddingTop: '8px', borderTop: '1px solid #444', color: '#bbb', fontSize: '11px' }}>
                  最后状态变更: {new Date(readyCondition.lastTransitionTime).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          </Card>
        </div>
      );
    }
    return null;
  };

  // 预加载图片
  useEffect(() => {
    preloadImages();
  }, []);

  // 当节点数据更新时重新渲染图形
  useEffect(() => {
    if (!isLoading && clusterListData?.clusters && imagesLoaded) {
      const cleanup = setTimeout(initGraph, 100);
      
      return () => {
        clearTimeout(cleanup);
      };
    }

    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, [clusterListData, isLoading, imagesLoaded, clusterNodes]);

  // 窗口大小变化时重新适配
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current) {
        graphRef.current.resize();
        graphRef.current.fitView();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* 添加滑动条样式 */}
      <style>{`
        /* 滑动条样式 */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }

        input[type="range"]::-webkit-slider-track {
          background: linear-gradient(to right, #1890ff, #722ed1);
          height: 4px;
          border-radius: 2px;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          background: #ffffff;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          border: 2px solid #1890ff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          background: #f0f8ff;
          border-color: #40a9ff;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
        }

        input[type="range"]::-moz-range-track {
          background: linear-gradient(to right, #1890ff, #722ed1);
          height: 4px;
          border-radius: 2px;
          border: none;
        }

        input[type="range"]::-moz-range-thumb {
          background: #ffffff;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          border: 2px solid #1890ff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        input[type="range"]::-moz-range-thumb:hover {
          background: #f0f8ff;
          border-color: #40a9ff;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
        }

        /* 滚动条样式 */
        .sidebar-content::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #1890ff, #722ed1);
          border-radius: 3px;
          transition: all 0.2s ease;
        }

        .sidebar-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #40a9ff, #9254de);
        }
      `}</style>

      <div style={{ position: 'relative', display: 'flex', height: '800px', gap: '8px' }}>
        {/* 主要拓扑图区域 */}
        <div
          style={{
            borderRadius: '16px',
            border: '1px solid #f0f0f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            flex: showSidebar ? `1 1 calc(100% - ${sidebarWidth + 20}px)` : '1 1 100%',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            transition: 'all 0.3s ease',
            minWidth: '300px',
            maxWidth: showSidebar ? `calc(100% - ${sidebarWidth + 20}px)` : '100%',
          }}
        >
          <Card
            style={{
              height: '100%',
              borderRadius: '16px',
              border: 'none',
              background: 'transparent',
            }}
            bodyStyle={{ 
              padding: '20px',
              height: '100%',
            }}
          >
            {/* 标题 */}
            <div style={{
              textAlign: 'center',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '20px',
                padding: '12px 24px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              }}>
                <ClusterOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
                <Text style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Karmada 集群拓扑图
                </Text>
              </div>
            </div>

            {/* 拓扑图容器 */}
            <div style={{ position: 'relative', height: 'calc(100% - 80px)' }}>
              {(isLoading || !imagesLoaded) ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: '100%',
                  gap: '16px'
                }}>
                  <Spin size="large" />
                  <Text type="secondary">
                    {isLoading ? '加载集群数据中...' : '加载节点图标中...'}
                  </Text>
                </div>
              ) : (
                <div 
                  ref={containerRef} 
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                  }} 
                />
              )}
            </div>
          </Card>
        </div>

        {/* 侧边栏数据看板 */}
        {showSidebar && (
          <div style={{ 
            position: 'relative', 
            display: 'flex', 
            width: `${sidebarWidth}px`,
            minWidth: `${sidebarWidth}px`,
            maxWidth: `${sidebarWidth}px`,
            flexShrink: 0,
            height: '800px', // 确保与主容器高度一致
          }}>
            {/* 拖拽调整宽度的分隔条 */}
            <div
              style={{
                width: '4px',
                height: '100%', // 明确设置高度为100%
                background: 'linear-gradient(to bottom, #1890ff, #722ed1)',
                cursor: 'col-resize',
                position: 'relative',
                borderRadius: '2px',
                marginRight: '4px',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = sidebarWidth;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const deltaX = startX - e.clientX;
                  const newWidth = Math.max(300, Math.min(800, startWidth + deltaX));
                  setSidebarWidth(newWidth);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  document.body.style.cursor = '';
                  document.body.style.userSelect = '';
                };
                
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #40a9ff, #9254de)';
                e.currentTarget.style.width = '6px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #1890ff, #722ed1)';
                e.currentTarget.style.width = '4px';
              }}
            >
              {/* 拖拽指示器 */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '2px',
                height: '20px',
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '1px'
              }} />
            </div>

            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #f0f0f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                flex: 1,
                marginBottom: '24px',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                position: 'relative',
                width: `${sidebarWidth - 12}px`,
                minWidth: `${sidebarWidth - 12}px`,
                maxWidth: `${sidebarWidth - 12}px`,
                height: '776px', // 固定高度，稍小于主容器以留出marginBottom空间
              }}
              bodyStyle={{ 
                padding: '0',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* 侧边栏头部 */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '16px 16px 0 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                    📊 节点详情
                  </Text>
                  <div style={{
                    fontSize: '12px',
                    color: '#999',
                    background: '#f5f5f5',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    宽度: {sidebarWidth}px
                  </div>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: '#999',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.color = '#666';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#999';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 宽度调整滑动条 */}
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid #f0f0f0',
                background: 'rgba(248, 249, 250, 0.8)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Text style={{ fontSize: '12px', color: '#666', minWidth: '60px' }}>
                    面板宽度:
                  </Text>
                  <input
                    type="range"
                    min="300"
                    max="800"
                    value={sidebarWidth}
                    onChange={(e) => setSidebarWidth(parseInt(e.target.value))}
                    style={{
                      flex: 1,
                      height: '4px',
                      background: 'linear-gradient(to right, #1890ff, #722ed1)',
                      borderRadius: '2px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  <Text style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>
                    {sidebarWidth}px
                  </Text>
                </div>
              </div>

              {/* 侧边栏内容区域 - 可滚动 */}
              <div 
                className="sidebar-content"
                style={{
                  flex: 1,
                  padding: '20px',
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}
              >
                {generateSidebarContent(selectedNode)}
              </div>
            </Card>
          </div>
        )}

        {/* 当侧边栏关闭时显示的打开按钮 */}
        {!showSidebar && (
          <div
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'linear-gradient(135deg, #1890ff, #722ed1)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
              transition: 'all 0.3s ease',
              zIndex: 1000
            }}
            onClick={() => setShowSidebar(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(24, 144, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.3)';
            }}
          >
            📊
          </div>
        )}
      </div>
    </>
  );
};

export default G6ClusterTopology; 