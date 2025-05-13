import React, { useEffect, useRef, useState } from 'react';
import { Card, Spin, Empty, Checkbox, Space, Button, Tooltip, Tag, Badge, Typography } from 'antd';
import { ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import i18nInstance from '@/utils/i18n';
import { useQuery } from '@tanstack/react-query';
import * as G6 from '@antv/g6';
import './styles.css';

const { Text } = Typography;

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
    data?: TopologyData;
  } & TopologyData;
}

interface ClusterTopologyProps {
  clusterName?: string;
  height?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ClusterTopology: React.FC<ClusterTopologyProps> = ({
  clusterName,
  height = 700,
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

  const checkG6Loaded = () => {
    if (typeof window === 'undefined' || (typeof window.G6 === 'undefined' && typeof G6 === 'undefined')) {
      console.error('G6 is not loaded');
      setError('G6图表库未加载，请刷新页面');
      return false;
    }
    return true;
  };

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

      const G6Instance = window.G6 || G6;
      
      // 注册自定义节点
      G6Instance.registerNode('icon-node', {
        draw(cfg: any, group: any) {
          const { id, label, style = {}, originData = {} } = cfg;
          const nodeType = originData.type || 'cluster';
          const size = cfg.size || 40;
          
          // 创建一个背景圆形
          const keyShape = group.addShape('circle', {
            attrs: {
              x: 0,
              y: 0,
              r: size / 2,
              fill: nodeType === 'control-plane' ? '#e6f7ff' : 
                    nodeType === 'cluster' ? '#f6ffed' : 
                    nodeType === 'node' ? '#e6fffb' : 
                    nodeType === 'pod' ? '#f9f0ff' : '#f0f0f0',
              stroke: nodeType === 'control-plane' ? '#1890ff' : 
                      nodeType === 'cluster' ? '#52c41a' : 
                      nodeType === 'node' ? '#13c2c2' : 
                      nodeType === 'pod' ? '#722ed1' : '#d9d9d9',
              lineWidth: 2,
              cursor: 'pointer',
              shadowColor: nodeType === 'control-plane' ? '#1890ff' : 
                          nodeType === 'cluster' ? '#52c41a' : 
                          nodeType === 'node' ? '#13c2c2' : 
                          nodeType === 'pod' ? '#722ed1' : '#d9d9d9',
              shadowBlur: 5,
            },
            name: 'node-keyShape',
          });
          
          // 根据节点类型添加不同的图形
          if (nodeType === 'control-plane') {
            // 控制平面图标 - 服务器样式
            group.addShape('rect', {
              attrs: {
                x: -size / 4,
                y: -size / 6,
                width: size / 2,
                height: size / 3,
                fill: '#1890ff',
                radius: 2,
              },
              name: 'node-icon-part1',
            });
            
            group.addShape('rect', {
              attrs: {
                x: -size / 3,
                y: -size / 4,
                width: size * 2/3,
                height: size / 2,
                fill: 'transparent',
                stroke: '#1890ff',
                lineWidth: 2,
                radius: 3,
              },
              name: 'node-icon-part2',
            });
          } else if (nodeType === 'cluster') {
            // 集群图标 - 同心圆
            group.addShape('circle', {
              attrs: {
                x: 0,
                y: 0,
                r: size / 4,
                fill: '#52c41a',
                opacity: 0.2,
                stroke: '#52c41a',
              },
              name: 'node-icon-part1',
            });
            
            group.addShape('circle', {
              attrs: {
                x: 0,
                y: 0,
                r: size / 6,
                fill: '#52c41a',
              },
              name: 'node-icon-part2',
            });
          } else if (nodeType === 'node') {
            // 节点图标 - 服务器
            group.addShape('rect', {
              attrs: {
                x: -size / 3,
                y: -size / 4,
                width: size * 2/3,
                height: size / 2,
                fill: '#e6fffb',
                stroke: '#13c2c2',
                lineWidth: 1.5,
                radius: 2,
              },
              name: 'node-icon-part1',
            });
            
            group.addShape('circle', {
              attrs: {
                x: -size / 6,
                y: 0,
                r: size / 12,
                fill: '#13c2c2',
              },
              name: 'node-icon-part2',
            });
            
            group.addShape('circle', {
              attrs: {
                x: size / 6,
                y: 0,
                r: size / 12,
                fill: '#13c2c2',
              },
              name: 'node-icon-part3',
            });
          } else if (nodeType === 'pod') {
            // Pod图标 - 六边形
            const hexagonPath = [
              ['M', 0, -size / 3],
              ['L', size / 3, -size / 6],
              ['L', size / 3, size / 6],
              ['L', 0, size / 3],
              ['L', -size / 3, size / 6],
              ['L', -size / 3, -size / 6],
              ['Z']
            ].map(point => point.join(' ')).join(' ');
            
            group.addShape('path', {
              attrs: {
                path: hexagonPath,
                fill: '#f9f0ff',
                stroke: '#722ed1',
                lineWidth: 1.5,
              },
              name: 'node-icon-part1',
            });
            
            group.addShape('circle', {
              attrs: {
                x: 0,
                y: 0,
                r: size / 8,
                fill: '#722ed1',
                opacity: 0.5,
              },
              name: 'node-icon-part2',
            });
          }
          
          // 添加节点标签
          group.addShape('text', {
            attrs: {
              text: label,
              x: 0,
              y: size / 2 + 15,
              textAlign: 'center',
              textBaseline: 'top',
              fill: '#333',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              background: {
                fill: '#fff',
                padding: [2, 5, 2, 5],
                radius: 2,
              },
            },
            name: 'node-label',
          });
          
          // 添加节点类型标签
          if (originData.type) {
            group.addShape('text', {
              attrs: {
                text: originData.type,
                x: 0,
                y: -size / 2 - 8,
                textAlign: 'center',
                textBaseline: 'bottom',
                fill: '#666',
                fontSize: 12,
                cursor: 'pointer',
                background: {
                  fill: 'rgba(255,255,255,0.8)',
                  padding: [2, 4, 2, 4],
                  radius: 2,
                },
              },
              name: 'node-type',
            });
          }
          
          // 添加状态指示器
          if (originData.status) {
            const statusColor = originData.status === 'ready' ? '#52c41a' : '#ff4d4f';
            group.addShape('circle', {
              attrs: {
                x: size / 2 - 5,
                y: -size / 2 + 5,
                r: 4,
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
          
          const textShape = group.find((element: any) => element.get('name') === 'node-label');
          if (textShape) {
            textShape.attr({
              text: label,
            });
          }
        },
      });
      
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
        fitViewPadding: 100,
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
        // 布局大小配置
        layout: {
          type: 'dagre',
          rankdir: 'LR',
          align: 'UL',
          // 节点间距
          nodesep: 20,
          // 层间距
          ranksep: 60,
          // 控制点
          controlPoints: true,
          // 节点大小
          nodeSize: 80,
          // 防止节点重叠
          preventOverlap: true,
          // 布局结束后的回调
          onLayoutEnd: () => {
            if (graph && !graph.destroyed) {
              setTimeout(() => {
                graph.fitView(80);
                graph.fitCenter();
              }, 200);
            }
          },
        },
        defaultNode: {
          type: 'icon-node',
          size: 50,
          style: {
            fill: '#e6f7ff',
            stroke: '#1890ff',
            lineWidth: 2,
            shadowColor: '#1890ff',
            shadowBlur: 5,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          labelCfg: {
            position: 'bottom',
            offset: 12,
            style: {
              fill: '#000',
              fontSize: 14,
              fontWeight: 500,
            },
          },
        },
        defaultEdge: {
          type: 'line',
          style: {
            stroke: '#91d5ff',
            lineWidth: 2,
            opacity: 0.8,
            endArrow: {
              path: 'M 0,0 L 8,4 L 8,-4 Z',
              fill: '#91d5ff',
            },
            radius: 10,
          },
          labelCfg: {
            autoRotate: true,
            style: {
              fill: '#666',
              fontSize: 12,
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

      graph.on('node:dragend', (evt: any) => {
        const { item } = evt;
        const edges = item.getEdges();
        edges.forEach((edge: any) => {
          graph.setItemState(edge, 'active', true);
          setTimeout(() => {
            graph.setItemState(edge, 'active', false);
          }, 1000);
        });
      });

      graphRef.current = graph;
      
      if (data?.data) {
        updateGraphData(data.data);
      } else {
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

  const getNodeSize = (node: any) => {
    switch (node.type) {
      case 'control-plane': return 80;
      case 'cluster': return 70;
      case 'node': return 60;
      case 'pod': return 40;
      default: return 50;
    }
  };

  const updateGraphData = (topologyData: any) => {
    if (!graphRef.current || !topologyData) return;
    
    try {
      console.log('更新拓扑图数据:', topologyData);
      
      const graphData = topologyData.data || topologyData;
      
      if (!Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
        console.error('拓扑图数据结构不正确:', topologyData);
        setError('拓扑图数据结构不正确');
        return;
      }
      
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
      
      const nodes: any[] = [];
      
      nodeGroups['control-plane'].forEach((node: any) => {
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          type: 'icon-node',
          depth: 0,
          originData: node,
        });
      });
      
      nodeGroups['cluster'].forEach((node: any, i: number) => {
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          type: 'icon-node',
          depth: 1,
          originData: node,
        });
      });
      
      nodeGroups['node'].forEach((node: any, i: number) => {
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          type: 'icon-node',
          depth: 2,
          originData: node,
        });
      });
      
      nodeGroups['pod'].forEach((node: any, i: number) => {
        const parentEdge = graphData.edges.find((edge: any) => edge.target === node.id);
        const parentDepth = parentEdge ? 
          nodes.find((n: any) => n.id === parentEdge.source)?.depth || 2 : 
          2;
        
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          type: 'icon-node',
          depth: parentDepth + 1,
          originData: node,
        });
      });
      
      nodeGroups['other'].forEach((node: any) => {
        nodes.push({
          id: node.id,
          label: node.name,
          size: getNodeSize(node),
          type: 'icon-node',
          depth: 3,
          originData: node,
        });
      });
      
      const edges = graphData.edges.map((edge: any) => {
        const isControlEdge = edge.type === 'control';
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.value > 1 ? `${edge.value}` : '',
          type: 'line',
          style: {
            stroke: isControlEdge ? '#1890ff' : '#52c41a',
            lineWidth: isControlEdge ? 2 : 1.5,
            opacity: 0.8,
            endArrow: {
              path: 'M 0,0 L 8,4 L 8,-4 Z',
              fill: isControlEdge ? '#1890ff' : '#52c41a',
            },
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
      
      graphRef.current.data({
        nodes,
        edges,
      });
      
      graphRef.current.render();
      
      setTimeout(() => {
        graphRef.current.fitView(80);
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

  useEffect(() => {
    if (data?.data) {
      updateGraphData(data.data);
    }
  }, [data]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (graphRef.current && containerRef.current) {
        graphRef.current.changeSize(
          containerRef.current.clientWidth,
          !isFullscreen ? window.innerHeight - 120 : height
        );
        graphRef.current.fitView(60);
        graphRef.current.fitCenter();
      }
    }, 100);
  };

  const renderTopologySummary = () => {
    if (!data?.data) return null;
    
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

declare global {
  interface Window {
    G6: any;
  }
}

export default ClusterTopology;