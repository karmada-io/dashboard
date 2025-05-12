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
import { Card, Spin, Empty, Checkbox, Space, Button, Tooltip, Tag, Badge, Typography } from 'antd';
import { ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import i18nInstance from '@/utils/i18n';
import { useQuery } from '@tanstack/react-query';
// 导入G6库，如果CDN加载失败可以使用此导入
import * as G6 from '@antv/g6';
import './styles.css';

const { Text } = Typography;

// 定义拓扑图数据类型
interface TopologyNode {
  id: string;
  name: string;
  type: string;
  status: string;
  parentId?: string;
  metadata?: Record<string, any>;
  resources?: {
    cpu?: {
      used: string;
      total: string;
      usageRate: number;
    };
    memory?: {
      used: string;
      total: string;
      usageRate: number;
    };
    pods?: {
      used: string;
      total: string;
      usageRate: number;
    };
  };
  labels?: Record<string, string>;
}

interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  value: number;
  metadata?: Record<string, any>;
}

interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  summary?: {
    totalClusters: number;
    totalNodes: number;
    totalPods: number;
    resourceDistribution?: Record<string, number>;
  };
}

interface TopologyResponse {
  code: number;
  message: string;
  data: {
    data?: TopologyData; // 添加可能的嵌套数据结构
  } & TopologyData; // 同时保留直接访问的能力
}

interface ClusterTopologyProps {
  clusterName?: string;
  height?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ClusterTopology: React.FC<ClusterTopologyProps> = ({
  clusterName,
  height = 600,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [showResources, setShowResources] = useState(true);
  const [showNodes, setShowNodes] = useState(true);
  const [showPods, setShowPods] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取拓扑图数据
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['GetTopology', clusterName, showResources, showNodes, showPods],
    queryFn: async () => {
      try {
        const baseUrl = clusterName
          ? `/api/v1/overview/topology/${clusterName}`
          : '/api/v1/overview/topology';
        
        const params = new URLSearchParams({
          showResources: String(showResources),
          showNodes: String(showNodes),
          showPods: String(showPods),
        });
        
        const response = await fetch(`${baseUrl}?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch topology data');
        }
        
        const result = await response.json();
        console.log('拓扑图数据获取成功:', result);
        return result as TopologyResponse;
      } catch (err) {
        console.error('拓扑图数据获取失败:', err);
        setError(err instanceof Error ? err.message : '获取拓扑图数据失败');
        throw err;
      }
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchOnWindowFocus: true,
  });

  // 检查G6是否已加载
  const checkG6Loaded = () => {
    if (typeof window === 'undefined' || (typeof window.G6 === 'undefined' && typeof G6 === 'undefined')) {
      console.error('G6 is not loaded');
      setError('G6图表库未加载，请刷新页面');
      return false;
    }
    return true;
  };

  // 初始化图表
  useEffect(() => {
    if (!containerRef.current || !checkG6Loaded()) return;
    
    // 销毁旧实例
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }

    console.log('初始化G6图表');
    
    try {
      const container = containerRef.current;
      const width = container.clientWidth || 800;
      const graphHeight = isFullscreen ? window.innerHeight - 150 : height;

      // 创建图表实例
      const G6Instance = window.G6 || G6;
      
      // 注册自定义节点，显示更多信息
      G6Instance.registerNode('cluster-node', {
        draw(cfg: any, group: any) {
          const { id, label, style = {}, originData = {} } = cfg;
          const { fill, stroke } = style;
          
          // 绘制主圆形，减小节点尺寸
          const keyShape = group.addShape('circle', {
            attrs: {
              x: 0,
              y: 0,
              r: cfg.size / 2,
              fill,
              stroke,
              lineWidth: 1.5, // 减小线宽
              cursor: 'pointer',
              shadowColor: stroke,
              shadowBlur: 3, // 减小阴影
              shadowOffsetX: 0,
              shadowOffsetY: 0,
            },
            name: 'node-keyShape',
          });
          
          // 添加标签，调整位置
          group.addShape('text', {
            attrs: {
              text: label,
              x: 0,
              y: cfg.size / 2 + 10, // 调整标签位置，增加与节点的距离
              textAlign: 'center',
              textBaseline: 'top',
              fill: '#333',
              fontSize: 11, // 减小字体
              fontWeight: 500,
              cursor: 'pointer',
              background: {
                fill: '#fff',
                padding: [2, 4, 2, 4],
                radius: 2,
              },
            },
            name: 'node-label',
          });
          
          // 添加类型标签，调整位置和大小
          if (originData.type) {
            group.addShape('text', {
              attrs: {
                text: originData.type,
                x: 0,
                y: -cfg.size / 2 - 6, // 调整位置，增加与节点的距离
                textAlign: 'center',
                textBaseline: 'bottom',
                fill: '#666',
                fontSize: 9, // 减小字体
                cursor: 'pointer',
                background: {
                  fill: 'rgba(255,255,255,0.8)',
                  padding: [1, 2, 1, 2],
                  radius: 2,
                },
              },
              name: 'node-type',
            });
          }
          
          // 添加状态标记，减小尺寸
          if (originData.status) {
            const statusColor = originData.status === 'ready' ? '#52c41a' : '#ff4d4f';
            group.addShape('circle', {
              attrs: {
                x: cfg.size / 2 - 4, // 调整位置
                y: -cfg.size / 2 + 4,
                r: 3, // 减小尺寸
                fill: statusColor,
                cursor: 'pointer',
              },
              name: 'node-status',
            });
          }
          
          return keyShape;
        },
        update(cfg: any, node: any) {
          const group = node.getContainer();
          const { label, style = {} } = cfg;
          const keyShape = node.get('keyShape');
          
          // 更新主形状样式
          keyShape.attr({
            fill: style.fill,
            stroke: style.stroke,
          });
          
          // 更新标签
          const textShape = group.find((element: any) => element.get('name') === 'node-label');
          if (textShape) {
            textShape.attr({
              text: label,
            });
          }
        },
      });
      
      // 注册提示框
      const tooltip = new G6Instance.Tooltip({
        itemTypes: ['node'],
        getContent: (e: any) => {
          const model = e.item.getModel();
          const originData = model.originData || {};
          
          let content = `
            <div class="g6-tooltip-title">${originData.name || model.label}</div>
            <div class="g6-tooltip-content">
              <div><strong>类型:</strong> ${originData.type || '未知'}</div>
              <div><strong>状态:</strong> ${originData.status || '未知'}</div>
          `;
          
          // 添加资源信息
          if (originData.resources) {
            const { cpu, memory, pods } = originData.resources;
            content += '<div class="g6-tooltip-section"><strong>资源使用情况:</strong></div>';
            
            if (cpu) {
              content += `<div>CPU: ${cpu.used}/${cpu.total} (${Math.round(cpu.usageRate)}%)</div>`;
            }
            
            if (memory) {
              content += `<div>内存: ${memory.used}/${memory.total} (${Math.round(memory.usageRate)}%)</div>`;
            }
            
            if (pods) {
              content += `<div>Pod: ${pods.used}/${pods.total} (${Math.round(pods.usageRate)}%)</div>`;
            }
          }
          
          // 添加标签信息
          if (originData.labels && Object.keys(originData.labels).length > 0) {
            content += '<div class="g6-tooltip-section"><strong>标签:</strong></div>';
            Object.entries(originData.labels).forEach(([key, value]) => {
              content += `<div class="g6-tooltip-label">${key}: ${value}</div>`;
            });
          }
          
          content += '</div>';
          return content;
        },
        offsetX: 10,
        offsetY: 10,
      });

      const graph = new G6Instance.Graph({
        container,
        width,
        height: graphHeight,
        fitView: true,
        fitViewPadding: 80, // 增加边距
        animate: true,
        modes: {
          default: [
            {
              type: 'drag-canvas',
              enableOptimize: true,
            },
            {
              type: 'zoom-canvas',
              enableOptimize: true,
              sensitivity: 1.5,
            },
            'drag-node',
            'click-select',
          ],
        },
        layout: {
          type: 'dagre', // 使用层次布局
          rankdir: 'LR', // 从左到右布局
          align: 'UL', // 左上对齐
          nodesep: 100, // 节点间距
          ranksep: 150, // 层级间距
          controlPoints: true, // 控制点
          nodeSize: 60, // 节点大小
          preventOverlap: true, // 防止重叠
          // 布局结束后再次优化位置
          onLayoutEnd: () => {
            if (graph && !graph.destroyed) {
              setTimeout(() => {
                graph.fitView(60);
                graph.fitCenter();
              }, 200);
            }
          },
        },
        defaultNode: {
          type: 'cluster-node',
          size: 30, // 默认节点尺寸
          style: {
            fill: '#e6f7ff',
            stroke: '#1890ff',
            lineWidth: 1.5, // 减小线宽
            shadowColor: '#1890ff',
            shadowBlur: 5, // 减小阴影
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          labelCfg: {
            position: 'bottom',
            offset: 8, // 减小标签偏移
            style: {
              fill: '#000',
              fontSize: 11, // 减小字体
              fontWeight: 500,
            },
          },
        },
        defaultEdge: {
          type: 'line', // 使用直线，而不是折线
          style: {
            stroke: '#91d5ff',
            lineWidth: 1.5,
            opacity: 0.7,
            endArrow: {
              path: 'M 0,0 L 6,3 L 6,-3 Z',
              fill: '#91d5ff',
            },
            radius: 10, // 拐角弧度
          },
          labelCfg: {
            autoRotate: true,
            style: {
              fill: '#666',
              fontSize: 10,
              background: {
                fill: '#fff',
                padding: [2, 4],
                radius: 2,
              },
            },
          },
        },
        nodeStateStyles: {
          hover: {
            fill: '#d3f0ff',
            stroke: '#69c0ff',
            lineWidth: 2,
            shadowBlur: 10,
          },
          selected: {
            fill: '#ffd591',
            stroke: '#ffa940',
            lineWidth: 2,
            shadowBlur: 10,
          },
        },
        edgeStateStyles: {
          hover: {
            stroke: '#69c0ff',
            lineWidth: 2,
            shadowBlur: 5,
          },
        },
        plugins: [tooltip],
      });

      // 注册节点交互行为
      graph.on('node:mouseenter', (evt: { item: any }) => {
        const { item } = evt;
        graph.setItemState(item, 'hover', true);
      });

      graph.on('node:mouseleave', (evt: { item: any }) => {
        const { item } = evt;
        graph.setItemState(item, 'hover', false);
      });

      graph.on('node:click', (evt: { item: any }) => {
        const { item } = evt;
        graph.setItemState(item, 'selected', true);
      });

      graph.on('canvas:click', () => {
        graph.getNodes().forEach((node: any) => {
          graph.clearItemStates(node);
        });
      });

      // 修改节点拖拽后的行为
      graph.on('node:dragend', (evt: any) => {
        const { item } = evt;
        // 高亮与当前节点相连的边
        const edges = item.getEdges();
        edges.forEach((edge: any) => {
          graph.setItemState(edge, 'active', true);
          setTimeout(() => {
            graph.setItemState(edge, 'active', false);
          }, 1000);
        });
        
        // 不再随机调整相关节点位置，避免重影
      });

      // 保存图表实例
      graphRef.current = graph;
      
      // 如果已有数据，立即渲染
      if (data?.data) {
        updateGraphData(data.data);
      } else {
        // 否则渲染一个简单的提示
        renderEmptyGraph();
      }

      console.log('G6图表创建成功');
    } catch (error) {
      console.error('创建G6图表失败:', error);
      setError('创建拓扑图失败，请刷新页面重试');
    }

    return () => {
      if (graphRef.current) {
        console.log('销毁G6图表');
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, [height, isFullscreen]);

  // 渲染空图表
  const renderEmptyGraph = () => {
    if (!graphRef.current) return;
    
    const emptyData = {
      nodes: [
        { id: 'empty', label: '等待数据...', x: 400, y: 250 }
      ],
      edges: []
    };
    
    graphRef.current.data(emptyData);
    graphRef.current.render();
  };

  // 处理节点颜色
  const getNodeColor = (node: any) => {
    switch (node.type) {
      case 'control-plane':
        return { fill: '#e6f7ff', stroke: '#1890ff' };
      case 'cluster':
        return node.status === 'ready' 
          ? { fill: '#f6ffed', stroke: '#52c41a' }
          : { fill: '#fff2e8', stroke: '#fa8c16' };
      case 'node':
        return node.status === 'ready'
          ? { fill: '#e6fffb', stroke: '#13c2c2' }
          : { fill: '#fff1f0', stroke: '#ff4d4f' };
      case 'pod':
        return node.status === 'ready'
          ? { fill: '#f9f0ff', stroke: '#722ed1' }
          : { fill: '#fff0f6', stroke: '#eb2f96' };
      default:
        return { fill: '#f0f0f0', stroke: '#d9d9d9' };
    }
  };

  // 处理节点大小
  const getNodeSize = (node: any) => {
    switch (node.type) {
      case 'control-plane': return 50; // 控制平面节点
      case 'cluster': return 40; // 集群节点
      case 'node': return 30; // 普通节点
      case 'pod': return 20; // Pod节点
      default: return 30;
    }
  };

  // 更新图表数据
  const updateGraphData = (topologyData: any) => {
    if (!graphRef.current || !topologyData) return;
    
    try {
      console.log('更新拓扑图数据:', topologyData);
      
      // 处理嵌套的数据结构
      const graphData = topologyData.data || topologyData;
      
      // 确保数据结构正确
      if (!Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
        console.error('拓扑图数据结构不正确:', topologyData);
        setError('拓扑图数据结构不正确');
        return;
      }
      
      // 按类型分组节点
      const nodeGroups: Record<string, any[]> = {
        'control-plane': [],
        'cluster': [],
        'node': [],
        'pod': [],
        'other': []
      };
      
      graphData.nodes.forEach((node: any) => {
        const type = node.type || 'other';
        if (nodeGroups[type]) {
          nodeGroups[type].push(node);
        } else {
          nodeGroups['other'].push(node);
        }
      });
      
      // 准备节点数据
      const nodes: any[] = [];
      
      // 处理控制平面节点 - 放在左侧
      nodeGroups['control-plane'].forEach((node: any) => {
        const colors = getNodeColor(node);
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          style: {
            fill: colors.fill,
            stroke: colors.stroke,
            lineWidth: 1.5,
          },
          // 设置层级，用于dagre布局
          depth: 0,
          originData: node,
        });
      });
      
      // 处理集群节点 - 放在中间
      nodeGroups['cluster'].forEach((node: any, i: number) => {
        const colors = getNodeColor(node);
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          style: {
            fill: colors.fill,
            stroke: colors.stroke,
            lineWidth: 1.5,
          },
          // 设置层级，用于dagre布局
          depth: 1,
          originData: node,
        });
      });
      
      // 处理节点 - 放在右侧
      nodeGroups['node'].forEach((node: any, i: number) => {
        const colors = getNodeColor(node);
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          style: {
            fill: colors.fill,
            stroke: colors.stroke,
            lineWidth: 1.5,
          },
          // 设置层级，用于dagre布局
          depth: 2,
          originData: node,
        });
      });
      
      // 处理Pod节点
      nodeGroups['pod'].forEach((node: any, i: number) => {
        const colors = getNodeColor(node);
        // 查找Pod所属的节点
        const parentEdge = graphData.edges.find((edge: any) => edge.target === node.id);
        const parentDepth = parentEdge ? 
          nodes.find((n: any) => n.id === parentEdge.source)?.depth || 2 : 
          2;
        
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          style: {
            fill: colors.fill,
            stroke: colors.stroke,
            lineWidth: 1.5,
          },
          // 设置层级，比父节点深一级
          depth: parentDepth + 1,
          originData: node,
        });
      });
      
      // 处理其他节点
      nodeGroups['other'].forEach((node: any) => {
        const colors = getNodeColor(node);
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          style: {
            fill: colors.fill,
            stroke: colors.stroke,
            lineWidth: 1.5,
          },
          depth: 3,
          originData: node,
        });
      });
      
      // 准备边数据
      const edges = graphData.edges.map((edge: any) => {
        const isControlEdge = edge.type === 'control';
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.value > 1 ? `${edge.value}` : '',
          type: 'line', // 使用直线类型
          style: {
            stroke: isControlEdge ? '#1890ff' : '#52c41a',
            lineWidth: isControlEdge ? 1.5 : 1,
            opacity: 0.7,
            // 添加箭头
            endArrow: {
              path: 'M 0,0 L 6,3 L 6,-3 Z',
              fill: isControlEdge ? '#1890ff' : '#52c41a',
            },
            // 添加边的动画效果
            lineDash: isControlEdge ? [0] : [5, 5],
            animation: isControlEdge ? undefined : {
              repeat: true,
              duration: 10000,
              lineDashOffset: [0, -30],
            },
          },
          originData: edge,
        };
      });
      
      // 更新图表数据
      graphRef.current.data({
        nodes,
        edges,
      });
      
      // 渲染图表
      graphRef.current.render();
      
      // 自动适应视图，增加边距
      setTimeout(() => {
        graphRef.current.fitView(60);
        // 额外调整视图，确保所有节点可见
        setTimeout(() => {
          graphRef.current.fitCenter();
        }, 100);
      }, 300);
      
      console.log('拓扑图数据已更新');
    } catch (error) {
      console.error('更新拓扑图数据失败:', error);
      setError('更新拓扑图数据失败');
    }
  };

  // 监听数据变化，更新图表
  useEffect(() => {
    if (data?.data) {
      updateGraphData(data.data);
    }
  }, [data]);

  // 切换全屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (graphRef.current && containerRef.current) {
        graphRef.current.changeSize(
          containerRef.current.clientWidth,
          !isFullscreen ? window.innerHeight - 120 : height // 调整全屏模式下的高度
        );
        graphRef.current.fitView(60);
        graphRef.current.fitCenter();
      }
    }, 100);
  };

  // 渲染拓扑图统计信息
  const renderTopologySummary = () => {
    if (!data?.data) return null;
    
    // 处理嵌套的数据结构
    const graphData = data.data.data || data.data;
    if (!graphData.summary) return null;

    const { totalClusters, totalNodes, totalPods, resourceDistribution } = graphData.summary;

    return (
      <div className="topology-summary">
        <Space size="large">
          <span>
            <Badge color="#1890ff" />
            <Text strong>{i18nInstance.t('集群')}: </Text>
            <Text>{totalClusters}</Text>
          </span>
          <span>
            <Badge color="#722ed1" />
            <Text strong>{i18nInstance.t('节点')}: </Text>
            <Text>{totalNodes}</Text>
          </span>
          <span>
            <Badge color="#13c2c2" />
            <Text strong>{i18nInstance.t('Pod')}: </Text>
            <Text>{totalPods}</Text>
          </span>
          {resourceDistribution && Object.entries(resourceDistribution).map(([key, value]) => (
            <span key={key}>
              <Badge color="#faad14" />
              <Text strong>{key}: </Text>
              <Text>{String(value)}</Text>
            </span>
          ))}
        </Space>
      </div>
    );
  };

  // 渲染拓扑图控制面板
  const renderTopologyControls = () => {
    return (
      <div className="topology-controls">
        <Space>
          <Checkbox
            checked={showResources}
            onChange={(e) => setShowResources(e.target.checked)}
          >
            {i18nInstance.t('显示资源')}
          </Checkbox>
          <Checkbox
            checked={showNodes}
            onChange={(e) => setShowNodes(e.target.checked)}
          >
            {i18nInstance.t('显示节点')}
          </Checkbox>
          <Checkbox
            checked={showPods}
            onChange={(e) => setShowPods(e.target.checked)}
          >
            {i18nInstance.t('显示Pod')}
          </Checkbox>
          <Tooltip title={i18nInstance.t('刷新')}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              size="small"
            />
          </Tooltip>
          <Tooltip title={isFullscreen ? i18nInstance.t('退出全屏') : i18nInstance.t('全屏')}>
            <Button
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              size="small"
            />
          </Tooltip>
        </Space>
        <div className="topology-last-updated">
          {i18nInstance.t('最后更新')}: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </div>
      </div>
    );
  };

  return (
    <Card
      title={i18nInstance.t('集群资源拓扑图')}
      className={`cluster-topology ${isFullscreen ? 'fullscreen' : ''}`}
      extra={renderTopologyControls()}
      styles={{ body: { padding: '12px' } }}
    >
      {renderTopologySummary()}
      <Spin spinning={isLoading}>
        {error ? (
          <Empty
            description={
              <div>
                <div>{error}</div>
                <Button type="primary" onClick={() => {
                  setError(null);
                  refetch();
                }} style={{ marginTop: '8px' }}>
                  {i18nInstance.t('重试')}
                </Button>
              </div>
            }
          />
        ) : (
          <div
            ref={containerRef}
            className="topology-container"
            style={{ height: isFullscreen ? 'calc(100vh - 150px)' : height }}
          />
        )}
        <div style={{ marginTop: '8px', textAlign: 'center', color: '#999' }}>
          提示：可以拖拽节点、缩放视图来调整拓扑图布局，鼠标悬停可查看详细信息
        </div>
      </Spin>
    </Card>
  );
};

// 为了全局访问G6
declare global {
  interface Window {
    G6: any;
  }
}

export default ClusterTopology; 