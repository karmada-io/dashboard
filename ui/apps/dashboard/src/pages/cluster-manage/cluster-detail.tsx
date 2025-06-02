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

import { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Typography, 
  Card, 
  Table, 
  Progress, 
  Statistic, 
  Tag, 
  Button,
  message,
  Flex,
  Space,
  Divider,
  Descriptions,
  Alert,
  Empty,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeftOutlined, 
  ReloadOutlined, 
  SettingOutlined,
  NodeIndexOutlined,
  BarChartOutlined,
  ClusterOutlined,
  MonitorOutlined,
  EyeOutlined,
  EditOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { GetClusterDetail, GetMemberClusterNodes } from '@/services/cluster';
import type { ClusterDetail, ClusterNode } from '@/services/cluster';
import '@/styles/tech-theme.css';
import ScrollContainer from '@/components/common/ScrollContainer';

const { Title, Text } = Typography;

interface NodeInfo {
  name: string;
  status: string;
  role: string;
  version: string;
  internalIP: string;
  osImage: string;
  architecture: string;
  cpuCapacity: string;
  memoryCapacity: string;
  conditions: Array<{
    type: string;
    status: string;
    reason: string;
    message: string;
  }>;
}

interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  node: string;
}

const ClusterDetailPage = () => {
  const { clusterName } = useParams<{ clusterName: string }>();
  const navigate = useNavigate();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: clusterDetail, isLoading, refetch } = useQuery({
    queryKey: ['GetClusterDetail', clusterName],
    queryFn: async () => {
      if (!clusterName) throw new Error('集群名称不能为空');
      const ret = await GetClusterDetail(clusterName);
      return ret.data;
    },
    enabled: !!clusterName,
  });

  // 获取成员集群节点数据
  const { data: nodeListData, isLoading: nodeLoading } = useQuery({
    queryKey: ['GetMemberClusterNodes', clusterName],
    queryFn: async () => {
      if (!clusterName) throw new Error('集群名称不能为空');
      const ret = await GetMemberClusterNodes({ clusterName });
      return ret.data;
    },
    enabled: !!clusterName,
  });

  // 转换节点数据为表格需要的格式
  const transformNodeData = (nodes: ClusterNode[]): NodeInfo[] => {
    return nodes.map(node => {
      // 通过conditions判断节点真实状态
      const readyCondition = node.status?.conditions?.find(condition => condition.type === 'Ready');
      const isReady = readyCondition ? readyCondition.status === 'True' : node.ready;
      
      return {
        name: node.objectMeta.name,
        status: isReady ? 'Ready' : 'NotReady',
        role: extractNodeRole(node.objectMeta.labels),
        version: node.status?.nodeInfo?.kubeletVersion || 'Unknown',
        internalIP: extractInternalIP(node.status?.addresses),
        osImage: node.status?.nodeInfo?.osImage || 'Unknown',
        architecture: node.status?.nodeInfo?.architecture || 'Unknown',
        cpuCapacity: node.status?.capacity?.cpu || 'Unknown',
        memoryCapacity: node.status?.capacity?.memory || 'Unknown',
        conditions: node.status?.conditions || [],
      };
    });
  };

  // 提取节点角色
  const extractNodeRole = (labels?: Record<string, string>): string => {
    if (!labels) return 'worker';
    const roles: string[] = [];
    if (labels['node-role.kubernetes.io/master'] !== undefined || labels['node-role.kubernetes.io/control-plane'] !== undefined) {
      roles.push('control-plane');
    }
    if (labels['node-role.kubernetes.io/etcd'] !== undefined) {
      roles.push('etcd');
    }
    if (labels['node-role.kubernetes.io/master'] !== undefined) {
      roles.push('master');
    }
    return roles.length > 0 ? roles.join(',') : 'worker';
  };

  // 提取内网IP
  const extractInternalIP = (addresses?: Array<{ type: string; address: string }>): string => {
    if (!addresses) return 'Unknown';
    const internalIP = addresses.find(addr => addr.type === 'InternalIP');
    return internalIP ? internalIP.address : 'Unknown';
  };

  const nodeData = nodeListData ? transformNodeData(nodeListData.nodes) : [];
  const [podData, setPodData] = useState<PodInfo[]>([]);

  // 模拟Pod数据 - 后续可以添加获取Pod的API
  useEffect(() => {
    if (clusterDetail) {
      setPodData([
        {
          name: 'karmada-system-pod-1',
          namespace: 'karmada-system',
          status: 'Running',
          ready: '1/1',
          restarts: 0,
          age: '2d',
          node: nodeData[0]?.name || 'unknown',
        },
        {
          name: 'kube-system-pod-1',
          namespace: 'kube-system',
          status: 'Running',
          ready: '1/1',
          restarts: 0,
          age: '3d',
          node: nodeData[1]?.name || 'unknown',
        },
      ]);
    }
  }, [clusterDetail, nodeData]);

  const handleBack = () => {
    navigate('/cluster-manage');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
      case 'running':
        return 'success';
      case 'notready':
      case 'pending':
        return 'warning';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const nodeColumns = [
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role: string) => {
        const roles = role.split(',');
        return (
          <>
            {roles.map((r, index) => (
              <Tag key={index} color="blue" style={{ marginBottom: '2px' }}>{r}</Tag>
            ))}
          </>
        );
      },
    },
    {
      title: 'Kubernetes版本',
      dataIndex: 'version',
      key: 'version',
      width: 140,
    },
    {
      title: '内网IP',
      dataIndex: 'internalIP',
      key: 'internalIP',
      width: 130,
    },
    {
      title: '操作系统',
      dataIndex: 'osImage',
      key: 'osImage',
      width: 150,
      render: (osImage: string) => (
        <Text style={{ fontSize: '12px' }}>{osImage}</Text>
      ),
    },
    {
      title: 'CPU',
      dataIndex: 'cpuCapacity',
      key: 'cpu',
      width: 80,
    },
    {
      title: '内存',
      dataIndex: 'memoryCapacity',
      key: 'memory',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: NodeInfo) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            style={{ fontSize: '12px' }}
          >
            查看
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            style={{ fontSize: '12px' }}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const podColumns = [
    {
      title: 'Pod名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '命名空间',
      dataIndex: 'namespace',
      key: 'namespace',
      render: (namespace: string) => <Tag color="cyan">{namespace}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '就绪状态',
      dataIndex: 'ready',
      key: 'ready',
    },
    {
      title: '重启次数',
      dataIndex: 'restarts',
      key: 'restarts',
    },
    {
      title: '运行时间',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '所在节点',
      dataIndex: 'node',
      key: 'node',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="tech-loading-spinner mb-4"></div>
          <Text>加载集群详情中...</Text>
        </div>
      </div>
    );
  }

  if (!clusterDetail) {
    return (
      <div className="p-6">
        <Alert
          message="集群不存在"
          description="未找到指定的集群信息"
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <ScrollContainer
      height="100vh"
      padding="0"
      background="transparent"
    >
      {messageContextHolder}
      <div className="tech-background min-h-screen">
        {/* 粒子背景效果 */}
        <div className="tech-particles-container">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="tech-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 15}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6">
          {/* 页面头部 */}
          <div className="mb-8">
            <Flex align="center" justify="space-between">
              <div>
                <Flex align="center" gap={16}>
                  <Button 
                    icon={<ArrowLeftOutlined />} 
                    onClick={handleBack}
                    style={{
                      borderColor: 'var(--tech-primary)',
                      color: 'var(--tech-primary)',
                    }}
                  >
                    返回
                  </Button>
                  <div>
                    <Title 
                      level={1} 
                      className="tech-hologram-text m-0 text-4xl font-bold"
                      style={{ color: 'var(--tech-primary)' }}
                    >
                      <ClusterOutlined className="mr-2" />
                      {clusterDetail.objectMeta.name}
                    </Title>
                    <Text className="text-gray-600 text-lg">
                      集群详细管理 - Kubernetes {clusterDetail.kubernetesVersion}
                    </Text>
                  </div>
                </Flex>
              </div>
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={() => refetch()}
                  loading={isLoading}
                  style={{
                    borderColor: 'var(--tech-primary)',
                    color: 'var(--tech-primary)',
                  }}
                >
                  刷新
                </Button>
                <Button 
                  icon={<SettingOutlined />}
                  className="tech-btn-primary"
                >
                  集群设置
                </Button>
              </Space>
            </Flex>
          </div>

          {/* 主要内容区域 */}
          <Card className="tech-card">
            {/* 自定义Tab导航栏 */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <Space size="middle">
                <Button 
                  className={activeTab === 'overview' ? 'tech-btn-primary' : ''}
                  style={activeTab !== 'overview' ? { 
                    borderColor: 'var(--tech-primary)', 
                    color: 'var(--tech-primary)',
                    background: 'transparent'
                  } : {}}
                  icon={<ClusterOutlined />}
                  onClick={() => setActiveTab('overview')}
                >
                  集群概览
                </Button>
                <Button 
                  className={activeTab === 'nodes' ? 'tech-btn-primary' : ''}
                  style={activeTab !== 'nodes' ? { 
                    borderColor: 'var(--tech-primary)', 
                    color: 'var(--tech-primary)',
                    background: 'transparent'
                  } : {}}
                  icon={<NodeIndexOutlined />}
                  onClick={() => setActiveTab('nodes')}
                >
                  节点详情
                </Button>
                <Button 
                  className={activeTab === 'monitoring' ? 'tech-btn-primary' : ''}
                  style={activeTab !== 'monitoring' ? { 
                    borderColor: 'var(--tech-primary)', 
                    color: 'var(--tech-primary)',
                    background: 'transparent'
                  } : {}}
                  icon={<MonitorOutlined />}
                  onClick={() => setActiveTab('monitoring')}
                >
                  监控信息
                </Button>
              </Space>
              <div className="mt-4">
                <Tag color="blue" className="tech-tag">
                  同步模式: {clusterDetail.syncMode}
                </Tag>
              </div>
            </div>

            {/* Tab内容 */}
            {activeTab === 'overview' && (
              <div>
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <Card title="基本信息" size="small" className="mb-4" style={{ height: '280px' }}>
                      <div style={{ position: 'absolute', top: '8px', right: '16px', zIndex: 1 }}>
                        <Tag color={clusterDetail.ready === 'True' ? 'success' : 'error'} style={{ fontSize: '12px' }}>
                          <MonitorOutlined style={{ marginRight: '4px' }} />
                          {clusterDetail.ready === 'True' ? '正常' : '异常'}
                        </Tag>
                      </div>
                      <div style={{ padding: '16px 0', height: '220px' }}>
                        <Row gutter={[24, 20]}>
                          {/* 左列 */}
                          <Col span={12}>
                            <div style={{ marginBottom: '20px' }}>
                              <Text style={{ fontSize: '13px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                                集群名称
                              </Text>
                              <Text strong style={{ fontSize: '14px' }}>{clusterDetail.objectMeta.name}</Text>
                            </div>
                            
                            <div style={{ marginBottom: '20px' }}>
                              <Text style={{ fontSize: '13px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                                创建时间
                              </Text>
                              <Text style={{ fontSize: '13px' }}>{clusterDetail.objectMeta.creationTimestamp?.split('T')[0] || '未知'}</Text>
                            </div>
                            
                            <div style={{ marginBottom: '20px' }}>
                              <Text style={{ fontSize: '13px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                                K8s版本
                              </Text>
                              <Tag color="blue" style={{ fontSize: '12px', padding: '2px 6px' }}>{clusterDetail.kubernetesVersion}</Tag>
                            </div>
                          </Col>
                          
                          {/* 右列 */}
                          <Col span={12}>
                            <div style={{ marginBottom: '20px' }}>
                              <Text style={{ fontSize: '13px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                                CPU使用率
                              </Text>
                              <div>
                                <Text strong style={{ fontSize: '14px', color: 'var(--warning-color)' }}>
                                  {(clusterDetail.allocatedResources?.cpuFraction || 0).toFixed(1)}%
                                </Text>
                                <Progress 
                                  percent={clusterDetail.allocatedResources?.cpuFraction || 0} 
                                  size="small" 
                                  className="mt-1"
                                  showInfo={false}
                                />
                              </div>
                            </div>
                            
                            <div style={{ marginBottom: '20px' }}>
                              <Text style={{ fontSize: '13px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                                内存使用率
                              </Text>
                              <div>
                                <Text strong style={{ fontSize: '14px', color: 'var(--purple-color)' }}>
                                  {(clusterDetail.allocatedResources?.memoryFraction || 0).toFixed(1)}%
                                </Text>
                                <Progress 
                                  percent={clusterDetail.allocatedResources?.memoryFraction || 0} 
                                  size="small" 
                                  className="mt-1"
                                  showInfo={false}
                                />
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </Card>

                    <Card title="标签信息" size="small" className="mb-4" style={{ height: '120px' }}>
                      <div style={{ padding: '8px 0', maxHeight: '80px', overflowY: 'auto' }}>
                        {clusterDetail.objectMeta.labels && Object.keys(clusterDetail.objectMeta.labels).length > 0 ? (
                          <Space wrap size="small">
                            {Object.entries(clusterDetail.objectMeta.labels).map(([key, value]) => (
                              <Tag key={key} color="cyan" style={{ fontSize: '12px', margin: '2px' }}>
                                {key}: {value}
                              </Tag>
                            ))}
                          </Space>
                        ) : (
                          <div style={{ 
                            paddingTop: '20px', 
                            textAlign: 'center', 
                            color: '#999' 
                          }}>
                            <Text type="secondary" style={{ fontSize: '13px' }}>暂无标签</Text>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* 节点统计详情卡片 */}
                    <Card 
                      title={
                        <Space>
                          <NodeIndexOutlined style={{ color: 'var(--tech-primary)' }} />
                          <span>节点统计详情</span>
                        </Space>
                      } 
                      size="small"
                      style={{ height: '140px' }}
                    >
                      <Row gutter={[16, 12]} style={{ marginTop: '8px' }}>
                        <Col span={8}>
                          <div className="text-center">
                            <div 
                              className="text-2xl font-bold tech-hologram-text"
                              style={{ 
                                color: 'var(--tech-primary)',
                                marginBottom: '4px'
                              }}
                            >
                              {clusterDetail.nodeSummary?.totalNum || 0}
                            </div>
                            <Text className="text-gray-600" style={{ fontSize: '12px', fontWeight: '500' }}>总节点数</Text>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div className="text-center">
                            <div 
                              className="text-2xl font-bold"
                              style={{ 
                                color: 'var(--success-color)',
                                marginBottom: '4px'
                              }}
                            >
                              {clusterDetail.nodeSummary?.readyNum || 0}
                            </div>
                            <Text className="text-gray-600" style={{ fontSize: '12px', fontWeight: '500' }}>就绪节点</Text>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div className="text-center">
                            <div 
                              className="text-2xl font-bold"
                              style={{ 
                                color: 'var(--error-color)',
                                marginBottom: '4px'
                              }}
                            >
                              {(clusterDetail.nodeSummary?.totalNum || 0) - (clusterDetail.nodeSummary?.readyNum || 0)}
                            </div>
                            <Text className="text-gray-600" style={{ fontSize: '12px', fontWeight: '500' }}>异常节点</Text>
                          </div>
                        </Col>
                      </Row>
                      <div style={{ marginTop: '16px', padding: '0 8px' }}>
                        <Progress 
                          percent={clusterDetail.nodeSummary?.totalNum ? 
                            Math.round((clusterDetail.nodeSummary.readyNum / clusterDetail.nodeSummary.totalNum) * 100) : 0
                          } 
                          size="small" 
                          showInfo={true}
                          format={(percent) => `${percent}% 节点就绪`}
                          strokeColor="var(--success-color)"
                        />
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    {/* 集群统计信息 */}
                    <Row gutter={[12, 12]} className="mb-4">
                      <Col span={24}>
                        <Card 
                          title={
                            <Space>
                              <MonitorOutlined style={{ color: 'var(--success-color)' }} />
                              <span>集群组件状态</span>
                            </Space>
                          } 
                          size="small"
                          style={{ height: '280px' }}
                        >
                          <div style={{ padding: '8px 0', height: '220px', overflowY: 'auto' }}>
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                              <Flex justify="space-between" align="center" style={{ padding: '6px 0' }}>
                                <Text style={{ fontSize: '14px', fontWeight: '500' }}>Karmada API Server</Text>
                                <Tag color="success" style={{ fontSize: '12px' }}>正常</Tag>
                              </Flex>
                              <Flex justify="space-between" align="center" style={{ padding: '6px 0' }}>
                                <Text style={{ fontSize: '14px', fontWeight: '500' }}>Controller Manager</Text>
                                <Tag color="success" style={{ fontSize: '12px' }}>正常</Tag>
                              </Flex>
                              <Flex justify="space-between" align="center" style={{ padding: '6px 0' }}>
                                <Text style={{ fontSize: '14px', fontWeight: '500' }}>Scheduler</Text>
                                <Tag color="success" style={{ fontSize: '12px' }}>正常</Tag>
                              </Flex>
                              <Flex justify="space-between" align="center" style={{ padding: '6px 0' }}>
                                <Text style={{ fontSize: '14px', fontWeight: '500' }}>Webhook</Text>
                                <Tag color="success" style={{ fontSize: '12px' }}>正常</Tag>
                              </Flex>
                              <Flex justify="space-between" align="center" style={{ padding: '6px 0' }}>
                                <Text style={{ fontSize: '14px', fontWeight: '500' }}>Agent</Text>
                                <Tag color={clusterDetail.syncMode === 'Pull' ? 'success' : 'default'} style={{ fontSize: '12px' }}>
                                  {clusterDetail.syncMode === 'Pull' ? '运行中' : '未启用'}
                                </Tag>
                              </Flex>
                              <Flex justify="space-between" align="center" style={{ padding: '6px 0' }}>
                                <Text style={{ fontSize: '14px', fontWeight: '500' }}>连接状态</Text>
                                <Tag color={clusterDetail.ready === 'True' ? 'success' : 'error'} style={{ fontSize: '12px' }}>
                                  {clusterDetail.ready === 'True' ? '已连接' : '连接异常'}
                                </Tag>
                              </Flex>
                            </Space>
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    {/* 集群资源统计 */}
                    <Card 
                      title={
                        <Space>
                          <CloudServerOutlined style={{ color: 'var(--tech-primary)' }} />
                          <span>集群资源</span>
                        </Space>
                      } 
                      size="small"
                      style={{ height: '280px' }}
                    >
                      <div style={{ padding: '8px 0', height: '230px' }}>
                        {/* 第一行：基础资源 */}
                        <Row gutter={[16, 16]} style={{ marginTop: '8px' }}>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--tech-primary)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                12
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>Deployment</Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--success-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                8
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>Service</Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--warning-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                5
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>Namespace</Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--info-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                3
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>Ingress</Text>
                            </div>
                          </Col>
                        </Row>

                        {/* 第二行：存储和配置资源 */}
                        <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--purple-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                15
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>ConfigMap</Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--orange-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                10
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>Secret</Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--cyan-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                6
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>PV</Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--magenta-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                4
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>PVC</Text>
                            </div>
                          </Col>
                        </Row>

                        {/* 第三行：Pod状态统计 */}
                        <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--success-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                {clusterDetail.allocatedResources?.allocatedPods || 45}
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>Running Pods</Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--warning-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                2
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>Pending Pods</Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--error-color)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                0
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>Failed Pods</Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <div 
                                className="text-lg font-bold"
                                style={{ 
                                  color: 'var(--tech-primary)', 
                                  fontSize: '20px', 
                                  lineHeight: '1.2',
                                  marginBottom: '4px'
                                }}
                              >
                                {clusterDetail.allocatedResources?.podCapacity || 110}
                              </div>
                              <Text className="text-gray-600" style={{ fontSize: '13px', fontWeight: '500' }}>Pod Capacity</Text>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            )}

            {activeTab === 'nodes' && (
              <div>
                <div className="tech-card mb-4">
                  <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
                    <div>
                      <Title level={4} style={{ margin: 0, color: 'var(--text-color)' }}>
                        节点列表
                      </Title>
                      <Text type="secondary">
                        管理集群中的 {nodeData.length} 个节点
                      </Text>
                    </div>
                  </Flex>
                </div>

                <Card className="tech-card" size="small">
                  <Table
                    columns={nodeColumns}
                    dataSource={nodeData}
                    rowKey="name"
                    size="small"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 个节点`,
                    }}
                    scroll={{ x: 1200, y: 400 }}
                  />
                </Card>
              </div>
            )}

            {activeTab === 'monitoring' && (
              <div>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card title="集群健康状态" size="small" className="tech-card">
                      <Empty description="监控数据暂未接入" />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="资源趋势" size="small" className="tech-card">
                      <Empty description="趋势图表暂未实现" />
                    </Card>
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ScrollContainer>
  );
};

export default ClusterDetailPage; 