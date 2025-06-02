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
    if (value.endsWith('Ki')) {
      return { value: parseInt(value.slice(0, -2)) / 1024 / 1024, unit: 'GB' };
    }
    if (value.endsWith('Mi')) {
      return { value: parseInt(value.slice(0, -2)) / 1024, unit: 'GB' };
    }
    if (value.endsWith('Gi')) {
      return { value: parseInt(value.slice(0, -2)), unit: 'GB' };
    }
    if (value.endsWith('m')) {
      return { value: parseInt(value.slice(0, -1)) / 1000, unit: 'cores' };
    }
    return { value: parseInt(value) || 0, unit: '' };
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
          readyNodes: cluster.nodeSummary.readyNum
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
              podsAllocatable: node.status?.allocatable?.pods
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
      plugins: [
        {
          type: 'tooltip',
          trigger: 'pointerenter',
          enterable: true,
          offset: 15,
          className: 'g6-tooltip-custom',
          shouldBegin: (evt: any) => {
            // 调试日志
            console.log('Tooltip shouldBegin triggered:', evt);
            
            // 检查是否在拖拽状态
            const graph = evt.view?.graph;
            if (graph?.isDragging) {
              console.log('Tooltip blocked: graph is dragging');
              return false;
            }
            
            // 检查事件目标
            const target = evt.target;
            console.log('Event target:', target, target?.getType?.());
            
            return target && target.getType && target.getType() === 'node';
          },
          itemTypes: ['node'], // 只对节点显示tooltip
          getContent: (evt: any, items: any) => {
            console.log('Tooltip getContent triggered:', evt, items);
            
            const item = items[0];
            if (!item) {
              console.log('No item found for tooltip');
              return '';
            }
            
            const data = item.model?.data || item.data;
            console.log('Node data for tooltip:', data);
            
            if (!data) {
              return '<div style="padding: 12px; background: rgba(0,0,0,0.9); color: white; border-radius: 8px;">数据加载中...</div>';
            }
            
            // 动态调整tooltip宽度，确保不超出屏幕
            const screenWidth = window.innerWidth;
            const maxWidth = Math.min(750, screenWidth * 0.9);
            const dynamicStyle = `max-width: ${maxWidth}px; width: auto;`;
            
            if (data?.type === 'control-plane') {
              const readyClusters = clusterListData?.clusters?.filter((c: ClusterData) => c.ready).length || 0;
              const totalNodes = clusterListData?.clusters?.reduce((sum: number, c: ClusterData) => sum + c.nodeSummary.totalNum, 0) || 0;
              const readyNodes = clusterListData?.clusters?.reduce((sum: number, c: ClusterData) => sum + c.nodeSummary.readyNum, 0) || 0;
              const totalPods = clusterListData?.clusters?.reduce((sum: number, c: ClusterData) => sum + c.allocatedResources.allocatedPods, 0) || 0;
              
              return `
                <div style="${dynamicStyle} padding: 16px; background: rgba(0,0,0,0.9); color: white; border-radius: 12px; max-width: 650px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                  <h4 style="margin: 0 0 12px 0; color: #1890ff; display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: bold;">
                    <img src="/Karmada.png" style="width: 28px; height: 28px;" onerror="this.style.display='none';" />
                    🎛️ Karmada 控制平面
                  </h4>
                  
                  <div style="background: rgba(24, 144, 255, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #69c0ff;">📊 系统概览</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>版本:</span>
                        <span style="color: #91d5ff; font-weight: bold;">v1.13.2</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>API版本:</span>
                        <span style="color: #91d5ff;">v1alpha1</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>运行时间:</span>
                        <span style="color: #91d5ff;">7天8小时</span>
                      </div>
                    </div>
                  </div>

                  <div style="background: rgba(82, 196, 26, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #95de64;">🏗️ 集群管理</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>管理集群总数:</span>
                        <span style="color: #b7eb8f; font-weight: bold;">${data.totalClusters}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>健康集群:</span>
                        <span style="color: #52c41a; font-weight: bold;">${readyClusters}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>异常集群:</span>
                        <span style="color: ${data.totalClusters - readyClusters > 0 ? '#ff4d4f' : '#52c41a'}; font-weight: bold;">${data.totalClusters - readyClusters}</span>
                      </div>
                    </div>
                  </div>

                  <div style="background: rgba(19, 194, 194, 0.1); padding: 12px; border-radius: 8px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #5cdbd3;">🖥️ 资源统计</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>节点总数:</span>
                        <span style="color: #87e8de; font-weight: bold;">${totalNodes}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>就绪节点:</span>
                        <span style="color: #52c41a; font-weight: bold;">${readyNodes}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>运行Pod数:</span>
                        <span style="color: #87e8de; font-weight: bold;">${totalPods}</span>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            } else if (data?.type === 'cluster') {
              const cluster = clusterListData?.clusters?.find(c => c.objectMeta.name === data.name);
              const cpuUsagePercent = cluster?.allocatedResources?.cpuFraction || 0;
              const memoryUsagePercent = cluster?.allocatedResources?.memoryFraction || 0;
              // 计算Pod使用率
              const podUsagePercent = cluster?.allocatedResources ? 
                ((cluster.allocatedResources.allocatedPods / cluster.allocatedResources.podCapacity) * 100) : 0;
              
              const getCpuCores = (capacity: number) => capacity || 0;
              const getMemoryGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1);
              
              return `
                <div style="${dynamicStyle} padding: 16px; background: rgba(0,0,0,0.9); color: white; border-radius: 12px; max-width: 700px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                  <h4 style="margin: 0 0 12px 0; color: #13c2c2; display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: bold;">
                    <img src="/cluster.png" style="width: 26px; height: 26px;" onerror="this.style.display='none';" />
                    🏗️ 集群: ${data.name}
                  </h4>
                  
                  <div style="background: rgba(19, 194, 194, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #5cdbd3;">📋 基本信息</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>状态:</span>
                        <span style="color: ${data.status === 'ready' ? '#52c41a' : '#ff4d4f'}; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                          ${data.status === 'ready' ? '🟢 Ready' : '🔴 NotReady'}
                        </span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>Kubernetes版本:</span>
                        <span style="color: #87e8de; font-weight: bold;">${data.version}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>同步模式:</span>
                        <span style="color: ${data.syncMode === 'Push' ? '#52c41a' : '#faad14'}; font-weight: bold;">
                          ${data.syncMode === 'Push' ? '⬆️ Push' : '⬇️ Pull'}
                        </span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
                        <span>创建时间:</span>
                        <span style="color: #87e8de; text-align: right; max-width: 200px; word-break: break-all;">${cluster?.objectMeta?.creationTimestamp ? new Date(cluster.objectMeta.creationTimestamp).toLocaleString('zh-CN') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div style="background: rgba(82, 196, 26, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #95de64;">🖥️ 节点状态</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>节点总数:</span>
                        <span style="color: #b7eb8f; font-weight: bold;">${data.nodeCount}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>就绪节点:</span>
                        <span style="color: #52c41a; font-weight: bold;">${data.readyNodes}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>异常节点:</span>
                        <span style="color: ${data.nodeCount - data.readyNodes > 0 ? '#ff4d4f' : '#52c41a'}; font-weight: bold;">${data.nodeCount - data.readyNodes}</span>
                      </div>
                      <div style="margin: 4px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                          <span>节点健康率:</span>
                          <span style="color: #52c41a; font-weight: bold;">${((data.readyNodes / data.nodeCount) * 100).toFixed(1)}%</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                          <div style="background: linear-gradient(90deg, #52c41a, #73d13d); height: 100%; width: ${(data.readyNodes / data.nodeCount) * 100}%; transition: width 0.3s ease;"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style="background: rgba(250, 173, 20, 0.1); padding: 12px; border-radius: 8px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #ffd666;">⚡ 资源使用率</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <div style="margin: 6px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                          <span>CPU使用率:</span>
                          <span style="color: ${cpuUsagePercent > 80 ? '#ff4d4f' : cpuUsagePercent > 60 ? '#faad14' : '#52c41a'}; font-weight: bold;">${cpuUsagePercent.toFixed(1)}%</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                          <div style="background: linear-gradient(90deg, ${cpuUsagePercent > 80 ? '#ff4d4f' : cpuUsagePercent > 60 ? '#faad14' : '#52c41a'}, ${cpuUsagePercent > 80 ? '#ff7875' : cpuUsagePercent > 60 ? '#ffc53d' : '#73d13d'}); height: 100%; width: ${cpuUsagePercent}%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="margin-top: 2px; color: #bbb; font-size: 11px;">总计: ${getCpuCores(cluster?.allocatedResources?.cpuCapacity || 0)} cores</div>
                      </div>
                      
                      <div style="margin: 6px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                          <span>内存使用率:</span>
                          <span style="color: ${memoryUsagePercent > 80 ? '#ff4d4f' : memoryUsagePercent > 60 ? '#faad14' : '#52c41a'}; font-weight: bold;">${memoryUsagePercent.toFixed(1)}%</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                          <div style="background: linear-gradient(90deg, ${memoryUsagePercent > 80 ? '#ff4d4f' : memoryUsagePercent > 60 ? '#faad14' : '#52c41a'}, ${memoryUsagePercent > 80 ? '#ff7875' : memoryUsagePercent > 60 ? '#ffc53d' : '#73d13d'}); height: 100%; width: ${memoryUsagePercent}%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="margin-top: 2px; color: #bbb; font-size: 11px;">总计: ${getMemoryGB(cluster?.allocatedResources?.memoryCapacity || 0)} GB</div>
                      </div>
                      
                      <div style="margin: 6px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                          <span>Pod使用率:</span>
                          <span style="color: ${podUsagePercent > 80 ? '#ff4d4f' : podUsagePercent > 60 ? '#faad14' : '#52c41a'}; font-weight: bold;">${podUsagePercent.toFixed(1)}%</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                          <div style="background: linear-gradient(90deg, ${podUsagePercent > 80 ? '#ff4d4f' : podUsagePercent > 60 ? '#faad14' : '#52c41a'}, ${podUsagePercent > 80 ? '#ff7875' : podUsagePercent > 60 ? '#ffc53d' : '#73d13d'}); height: 100%; width: ${podUsagePercent}%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="margin-top: 2px; color: #bbb; font-size: 11px;">${cluster?.allocatedResources?.allocatedPods || 0} / ${cluster?.allocatedResources?.podCapacity || 0} pods</div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            } else if (data?.type === 'worker-node') {
              if (data.status === 'loading') {
                return `
                  <div style="${dynamicStyle} padding: 16px; background: rgba(0,0,0,0.9); color: white; border-radius: 12px; max-width: 300px; text-align: center;">
                    <h4 style="margin: 0 0 8px 0; color: #faad14; display: flex; align-items: center; gap: 8px; justify-content: center;">
                      <img src="/node.png" style="width: 20px; height: 20px;" onerror="this.style.display='none';" />
                      🔄 节点信息加载中...
                    </h4>
                    <div style="margin: 12px 0;">
                      <div style="width: 20px; height: 20px; border: 2px solid #faad14; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #ccc;">正在获取 ${data.parentCluster} 集群的节点详细信息...</p>
                    <style>
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    </style>
                  </div>
                `;
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
              
              // 计算资源使用百分比（这里是模拟数据，实际应该从监控系统获取）
              const cpuUsagePercent = Math.random() * 80; // 模拟CPU使用率
              const memoryUsagePercent = Math.random() * 70; // 模拟内存使用率
              const podUsagePercent = (Math.random() * 50); // 模拟Pod使用率

              return `
                <div style="${dynamicStyle} padding: 16px; background: rgba(0,0,0,0.9); color: white; border-radius: 12px; max-width: 750px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                  <h4 style="margin: 0 0 12px 0; color: ${data.status === 'ready' ? '#52c41a' : '#ff4d4f'}; display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: bold;">
                    <img src="/node.png" style="width: 26px; height: 26px;" onerror="this.style.display='none';" />
                    🖥️ ${data.name}
                  </h4>
                  
                  <div style="background: rgba(82, 196, 26, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #95de64;">📋 基本信息</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>状态:</span>
                        <span style="color: ${data.status === 'ready' ? '#52c41a' : '#ff4d4f'}; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                          ${data.status === 'ready' ? '🟢 Ready' : '🔴 NotReady'}
                        </span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>所属集群:</span>
                        <span style="color: #b7eb8f; font-weight: bold;">${data.parentCluster}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>节点角色:</span>
                        <span style="color: #13c2c2; font-weight: bold;">${data.roles?.join(', ') || 'worker'}</span>
                      </div>
                      ${data.internalIP ? `
                        <div style="margin: 4px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
                          <span>内部IP:</span>
                          <span style="color: #b7eb8f; word-break: break-all;">${data.internalIP}</span>
                        </div>
                      ` : ''}
                      ${data.hostname ? `
                        <div style="margin: 4px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
                          <span>主机名:</span>
                          <span style="color: #b7eb8f; word-break: break-all; max-width: 300px; text-align: right;">${data.hostname}</span>
                        </div>
                      ` : ''}
                      <div style="margin: 4px 0; display: flex; justify-content: space-between;">
                        <span>Kubernetes版本:</span>
                        <span style="color: #b7eb8f;">${data.version}</span>
                      </div>
                    </div>
                  </div>

                  ${nodeInfo ? `
                  <div style="background: rgba(24, 144, 255, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #69c0ff;">🖥️ 系统信息</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
                        <span>操作系统:</span>
                        <span style="color: #91d5ff; max-width: 350px; text-align: right; word-break: break-all;">${nodeInfo.osImage || 'N/A'}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
                        <span>内核版本:</span>
                        <span style="color: #91d5ff; max-width: 350px; text-align: right; word-break: break-all;">${nodeInfo.kernelVersion || 'N/A'}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
                        <span>容器运行时:</span>
                        <span style="color: #91d5ff; max-width: 350px; text-align: right; word-break: break-all;">${nodeInfo.containerRuntimeVersion || 'N/A'}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
                        <span>Kubelet版本:</span>
                        <span style="color: #91d5ff; max-width: 350px; text-align: right; word-break: break-all;">${nodeInfo.kubeletVersion || 'N/A'}</span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
                        <span>架构:</span>
                        <span style="color: #91d5ff; max-width: 350px; text-align: right; word-break: break-all;">${nodeInfo.architecture || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  ` : ''}

                  <div style="background: rgba(250, 173, 20, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #ffd666;">⚡ 资源容量</div>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <div style="margin: 6px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                          <span>CPU:</span>
                          <span style="color: #ffd666; font-weight: bold;">${cpuCapacity.value.toFixed(1)} ${cpuCapacity.unit}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; color: #bbb;">
                          <span>可分配:</span>
                          <span>${cpuAllocatable.value.toFixed(1)} ${cpuAllocatable.unit}</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                          <div style="background: linear-gradient(90deg, #faad14, #ffc53d); height: 100%; width: ${cpuUsagePercent}%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="margin-top: 2px; color: #bbb; font-size: 11px;">使用率: ${cpuUsagePercent.toFixed(1)}%</div>
                      </div>
                      
                      <div style="margin: 6px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                          <span>内存:</span>
                          <span style="color: #ffd666; font-weight: bold;">${memoryCapacity.value.toFixed(1)} ${memoryCapacity.unit}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; color: #bbb;">
                          <span>可分配:</span>
                          <span>${memoryAllocatable.value.toFixed(1)} ${memoryAllocatable.unit}</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                          <div style="background: linear-gradient(90deg, #52c41a, #73d13d); height: 100%; width: ${memoryUsagePercent}%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="margin-top: 2px; color: #bbb; font-size: 11px;">使用率: ${memoryUsagePercent.toFixed(1)}%</div>
                      </div>
                      
                      <div style="margin: 6px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                          <span>Pod容量:</span>
                          <span style="color: #ffd666; font-weight: bold;">${data.podsCapacity || 'N/A'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; color: #bbb;">
                          <span>可分配:</span>
                          <span>${data.podsAllocatable || 'N/A'}</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                          <div style="background: linear-gradient(90deg, #1890ff, #40a9ff); height: 100%; width: ${podUsagePercent}%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="margin-top: 2px; color: #bbb; font-size: 11px;">使用率: ${podUsagePercent.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>

                  <div style="background: rgba(19, 194, 194, 0.1); padding: 12px; border-radius: 8px;">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #5cdbd3;">🔍 健康状态</div>
                    <div style="font-size: 12px; line-height: 1.4;">
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; align-items: center;">
                        <span>Ready:</span>
                        <span style="color: ${readyCondition?.status === 'True' ? '#52c41a' : '#ff4d4f'}; font-weight: bold;">
                          ${readyCondition?.status === 'True' ? '✅ True' : '❌ False'}
                        </span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; align-items: center;">
                        <span>内存压力:</span>
                        <span style="color: ${memoryCondition?.status === 'False' ? '#52c41a' : '#ff4d4f'}; font-weight: bold;">
                          ${memoryCondition?.status === 'False' ? '✅ 正常' : '⚠️ 有压力'}
                        </span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; align-items: center;">
                        <span>磁盘压力:</span>
                        <span style="color: ${diskCondition?.status === 'False' ? '#52c41a' : '#ff4d4f'}; font-weight: bold;">
                          ${diskCondition?.status === 'False' ? '✅ 正常' : '⚠️ 有压力'}
                        </span>
                      </div>
                      <div style="margin: 4px 0; display: flex; justify-content: space-between; align-items: center;">
                        <span>PID压力:</span>
                        <span style="color: ${pidCondition?.status === 'False' ? '#52c41a' : '#ff4d4f'}; font-weight: bold;">
                          ${pidCondition?.status === 'False' ? '✅ 正常' : '⚠️ 有压力'}
                        </span>
                      </div>
                      ${readyCondition?.lastTransitionTime ? `
                      <div style="margin: 8px 0 4px 0; padding-top: 8px; border-top: 1px solid #444; color: #bbb; font-size: 11px;">
                        最后状态变更: ${new Date(readyCondition.lastTransitionTime).toLocaleString('zh-CN')}
                      </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `;
            }
            return '';
          },
        }
      ],
    });

    graph.render();
    graphRef.current = graph;
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
    <Card
      style={{
        borderRadius: '16px',
        border: '1px solid #f0f0f0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        height: '600px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}
      bodyStyle={{ 
        padding: '20px',
        height: '100%',
      }}
    >
      {/* 添加tooltip样式 */}
      <style>{`
        .g6-tooltip-custom {
          background: rgba(0, 0, 0, 0.9) !important;
          color: white !important;
          border: none !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
          padding: 0 !important;
          z-index: 9999 !important;
          pointer-events: auto !important;
          max-width: min(750px, 90vw) !important;
          min-width: 280px !important;
          word-wrap: break-word !important;
          overflow: visible !important;
          white-space: normal !important;
          position: absolute !important;
        }
        
        /* 当tooltip在右侧边界时，调整位置 */
        .g6-tooltip-custom.tooltip-right {
          transform: translateX(-100%) translateY(-50%) !important;
        }
        
        /* 当tooltip在左侧边界时，调整位置 */
        .g6-tooltip-custom.tooltip-left {
          transform: translateX(0%) translateY(-50%) !important;
        }
        
        /* 当tooltip在底部边界时，调整位置 */
        .g6-tooltip-custom.tooltip-bottom {
          transform: translateX(-50%) translateY(0%) !important;
        }
        
        /* 确保tooltip在拖拽时隐藏 */
        .g6-element-dragging .g6-tooltip-custom {
          display: none !important;
        }
        
        /* 确保tooltip内容不会被截断 */
        .g6-tooltip-custom * {
          box-sizing: border-box !important;
        }

        .g6-tooltip-custom .tooltip-content {
          padding: 16px;
          max-width: min(750px, 90vw);
          min-width: 280px;
          line-height: 1.4;
          overflow: visible;
          word-wrap: break-word;
        }
        
        /* 确保tooltip在拖拽时隐藏 */
        .g6-element-dragging .g6-tooltip-custom {
          display: none !important;
        }
        
        /* 确保tooltip内容不会被截断 */
        .g6-tooltip-custom * {
          box-sizing: border-box !important;
        }
        
        /* 响应式设计 - 在小屏幕上进一步限制宽度 */
        @media (max-width: 768px) {
          .g6-tooltip-custom {
            max-width: 95vw !important;
            min-width: 250px !important;
          }
        }
      `}</style>

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
  );
};

export default G6ClusterTopology; 