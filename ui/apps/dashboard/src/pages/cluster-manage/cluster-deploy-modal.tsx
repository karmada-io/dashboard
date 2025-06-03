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

import { FC, useState } from 'react';
import { 
  Modal, 
  Steps, 
  Form, 
  Select, 
  Input, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Card, 
  Typography, 
  Divider,
  Switch,
  message,
  Spin,
  Alert,
  Row,
  Col,
  Descriptions
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  LoadingOutlined,
  DesktopOutlined,
  SettingOutlined,
  DeploymentUnitOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

export interface ClusterDeployModalProps {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
}

interface NodeInfo {
  id: string;
  ip: string;
  password: string;
  role: 'master' | 'worker';
  enableEtcd: boolean;
  status: 'pending' | 'testing' | 'connected' | 'failed';
  systemInfo?: {
    os: string;
    cpu: string;
    memory: string;
    disk: string;
  };
}

const ClusterDeployModal: FC<ClusterDeployModalProps> = (props) => {
  const { open, onOk, onCancel } = props;
  const [messageApi, messageContextHolder] = message.useMessage();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [nodeForm] = Form.useForm();
  
  // 状态管理
  const [k8sVersion, setK8sVersion] = useState('v1.30.11+rke2r1');
  const [clusterName, setClusterName] = useState('');
  const [accessMode, setAccessMode] = useState<'Push' | 'Pull'>('Push');
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [enableHA, setEnableHA] = useState(false);
  const [testingNodes, setTestingNodes] = useState<Set<string>>(new Set());
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);

  // K8S版本选项
  const k8sVersions = [
    'v1.30.11+rke2r1',
    'v1.29.10+rke2r1',
    'v1.28.15+rke2r1',
    'v1.27.19+rke2r1',
    '1.29.0',
    '1.28.0', 
    '1.27.0',
    '1.26.0',
    '1.25.0'
  ];

  // 重置表单
  const resetForm = () => {
    setCurrentStep(0);
    setK8sVersion('v1.30.11+rke2r1');
    setClusterName('');
    setAccessMode('Push');
    setNodes([]);
    setEnableHA(false);
    setTestingNodes(new Set());
    setDeploymentProgress(0);
    setIsDeploying(false);
    form.resetFields();
    nodeForm.resetFields();
  };

  // 添加节点
  const addNode = () => {
    nodeForm.validateFields().then(values => {
      const newNode: NodeInfo = {
        id: Date.now().toString(),
        ip: values.ip,
        password: values.password,
        role: values.role || 'worker',
        enableEtcd: values.role === 'master',
        status: 'pending'
      };
      setNodes([...nodes, newNode]);
      nodeForm.resetFields();
      
      // 自动测试连接
      setTimeout(() => {
        testConnection(newNode.id);
      }, 100);
    }).catch(err => {
      console.log('Validation failed:', err);
    });
  };

  // 删除节点
  const removeNode = (id: string) => {
    setNodes(nodes.filter(node => node.id !== id));
  };

  // 测试节点连接
  const testConnection = async (nodeId: string) => {
    setTestingNodes(prev => new Set([...prev, nodeId]));
    
    // 模拟连接测试
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80%成功率
      setNodes(prevNodes => 
        prevNodes.map(node => {
          if (node.id === nodeId) {
            if (success) {
              // 根据节点角色设置不同的内存配置
              const memory = node.role === 'master' ? '8GB' : '4GB';
              return {
                ...node,
                status: 'connected',
                systemInfo: {
                  os: 'Anolis OS 8.10',
                  cpu: '4 cores (Intel Xeon)',
                  memory: memory,
                  disk: '100GB SSD'
                }
              };
            } else {
              return { ...node, status: 'failed' };
            }
          }
          return node;
        })
      );
      setTestingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
      
      if (success) {
        messageApi.success('节点连接测试成功');
      } else {
        messageApi.error('节点连接测试失败，请检查IP地址和密码');
      }
    }, 2000);
  };

  // 更新节点角色
  const updateNodeRole = (nodeId: string, role: 'master' | 'worker') => {
    setNodes(prevNodes => 
      prevNodes.map(node => {
        if (node.id === nodeId) {
          const updatedNode = { ...node, role };
          // 如果节点已连接，更新内存信息
          if (node.status === 'connected' && node.systemInfo) {
            const memory = role === 'master' ? '8GB' : '4GB';
            updatedNode.systemInfo = {
              ...node.systemInfo,
              memory: memory
            };
          }
          return updatedNode;
        }
        return node;
      })
    );
  };

  // 更新节点etcd状态
  const updateNodeEtcd = (nodeId: string, enableEtcd: boolean) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId ? { ...node, enableEtcd } : node
      )
    );
  };

  // 添加集群到Karmada
  const addClusterToKarmada = async (clusterName: string) => {
    const kubeconfig = `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJlVENDQVIrZ0F3SUJBZ0lCQURBS0JnZ3Foa2pPUFFRREFqQWtNU0l3SUFZRFZRUUREQmx5YTJVeUxYTmwKY25abGNpMWpZVUF4TnpRM05UWTBNek0yTUI0WERUSTFNRFV4T0RFd016SXhObG9YRFRNMU1EVXhOakV3TXpJeApObG93SkRFaU1DQUdBMVVFQXd3WmNtdGxNaTF6WlhKMlpYSXRZMkZBTVRjME56VTJORE16TmpCWk1CTUdCeXFHClNNNDlBZ0VHQ0NxR1NNNDlBd0VIQTBJQUJNbWE4WTJjeXJJd1BUTHp6SC9pZk9OWlJuWE8xby9veDdrTGl3U2cKTjdJd2ZRU1JZMjlNSzh6SnVRaXNFeHA1UlJmVGg0bEJNNERTVGFDRDdvbG5sQXFqUWpCQU1BNEdBMVVkRHdFQgovd1FFQXdJQ3BEQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01CMEdBMVVkRGdRV0JCVFl4NExFTENCd0lTYXVIa0pGCmFJQ3h1cEZ4eXpBS0JnZ3Foa2pPUFFRREFnTklBREJGQWlFQWo3ZXlKbVBLbk4yUWlpK3NaMGNsSGUvRVpBVTkKVE1BZ2JwaXpiS1JONzNjQ0lEenRITmJMMEVENGhqSmlEU3VqVnlScW5KSUM3amp3VEtzMDh1dWV0eDIzCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
    server: https://10.10.20.250:6443
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
kind: Config
preferences: {}
users:
- name: default
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJrVENDQVRpZ0F3SUJBZ0lJVTlsTkJDV1dtK0F3Q2dZSUtvWkl6ajBFQXdJd0pERWlNQ0FHQTFVRUF3d1oKY210bE1pMWpiR2xsYm5RdFkyRkFNVGMwTnpVMk5ETXpOakFlRncweU5UQTFNVGd4TURNeU1UWmFGdzB5TmpBMQpNVGd4TURNeU1UWmFNREF4RnpBVkJnTlZCQW9URG5ONWMzUmxiVHB0WVhOMFpYSnpNUlV3RXdZRFZRUURFd3h6CmVYTjBaVzA2WVdSdGFXNHdXVEFUQmdjcWhrak9QUUlCQmdncWhrak9QUU1CQndOQ0FBUVQ0dmJhOUM4U09WUngKQ005N2hxOGpVb1VCYWxITlhSK1M0bmptUE9vdjlTOXRLSURWaDV3YUxPNU5FZ04xUU1pVnJkbitPSG04ZVRTQQo5S283MjQ0dm8wZ3dSakFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUhBd0l3Ckh3WURWUjBqQkJnd0ZvQVVsMWVncFUrQmZSSWZteUFoMWlDOUFwUXdkc3d3Q2dZSUtvWkl6ajBFQXdJRFJ3QXcKUkFJZ0Q5U2tVbzZLeHV1dXlqMkJ6dG9mZmFPR1U2VjhRcTV3bFpFbGN6RjJDNVlDSUJUWjl4akF6QURoZFdUUwpSOXFlWlB5dUJBNjVFYWRadk5rdjd6WHF4aDlUCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJlakNDQVIrZ0F3SUJBZ0lCQURBS0JnZ3Foa2pPUFFRREFqQWtNU0l3SUFZRFZRUUREQmx5YTJVeUxXTnMKYVdWdWRDMWpZVUF4TnpRM05UWTBNek0yTUI0WERUSTFNRFV4T0RFd016SXhObG9YRFRNMU1EVXhOakV3TXpJeApObG93SkRFaU1DQUdBMVVFQXd3WmNtdGxNaTFqYkdsbGJuUXRZMkZBTVRjME56VTJORE16TmpCWk1CTUdCeXFHClNNNDlBZ0VHQ0NxR1NNNDlBd0VIQTBJQUJBNTV1SzVuTktFK09PMHBZMTZwT2V5aDdxaWhDaElVM2dnN25EVk0KbzBRYnVTcHNjRkZrdE84SUJYWDZ6UmtzNGNsKzRpRmJoSGg3WHpiVjlKMy80dFNqUWpCQU1BNEdBMVVkRHdFQgovd1FFQXdJQ3BEQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01CMEdBMVVkRGdRV0JCU1hWNkNsVDRGOUVoK2JJQ0hXCklMMENsREIyekRBS0JnZ3Foa2pPUFFRREFnTkpBREJHQWlFQWpVUittRnRqSmlYaC9RV1JSYW9MZ0ZpZ1pkRFMKVjk2dGZUVXRXbDFtUzdFQ0lRRDJWZTdLWFBpTkNEWi9iZ2lwNktqcGt6Q2o0NUtjZERoZzM3UitDUmt5WUE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSURwVUE3Zzk1TGp1VmlQOE8zK1pScU9YSUxIdGFSdTNtZlJSWjIxdDZPSzNvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFRStMMjJ2UXZFamxVY1FqUGU0YXZJMUtGQVdwUnpWMGZrdUo0NWp6cUwvVXZiU2lBMVllYwpHaXp1VFJJRGRVRElsYTNaL2poNXZIazBnUFNxTzl1T0x3PT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=`;

    try {
      // 调用添加集群接口
      const response = await fetch('/api/v1/clusters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: clusterName,
          kubeconfig: kubeconfig,
          mode: accessMode,
          description: `通过集群部署功能自动创建的${accessMode}模式集群`
        })
      });

      if (response.ok) {
        messageApi.success(`集群 ${clusterName} 已成功添加到Karmada！`);
      } else {
        messageApi.error('添加集群到Karmada失败');
      }
    } catch (error) {
      console.error('添加集群失败:', error);
      messageApi.error('添加集群到Karmada失败');
    }
  };

  // 模拟部署过程
  const startDeployment = () => {
    setIsDeploying(true);
    setDeploymentProgress(0);
    
    const interval = setInterval(() => {
      setDeploymentProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDeploying(false);
          messageApi.success('集群部署完成！');
          
          // 部署完成后添加集群到Karmada
          setTimeout(async () => {
            await addClusterToKarmada(clusterName);
            setTimeout(() => {
              onOk();
              resetForm();
            }, 1000);
          }, 1000);
          
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
  };

  // 步骤配置
  const steps = [
    {
      title: '基础配置',
      icon: <SettingOutlined />,
    },
    {
      title: '节点配置',
      icon: <DesktopOutlined />,
    },
    {
      title: '节点角色分配',
      icon: <DeploymentUnitOutlined />,
    },
    {
      title: '部署确认',
      icon: <CheckCircleOutlined />,
    }
  ];

  // 节点表格列配置
  const nodeColumns = [
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '连接状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: NodeInfo) => {
        const isLoading = testingNodes.has(record.id);
        if (isLoading) {
          return <Tag icon={<LoadingOutlined />} color="processing">测试中</Tag>;
        }
        switch (status) {
          case 'connected':
            return <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>;
          case 'failed':
            return <Tag icon={<ExclamationCircleOutlined />} color="error">连接失败</Tag>;
          default:
            return <Tag color="default">待测试</Tag>;
        }
      }
    },
    {
      title: '节点角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: 'master' | 'worker', record: NodeInfo) => (
        <Select<'master' | 'worker'>
          value={role}
          style={{ width: 120 }}
          onChange={(value) => updateNodeRole(record.id, value)}
          disabled={record.status !== 'connected'}
        >
          <Option value="master">控制节点</Option>
          <Option value="worker">工作节点</Option>
        </Select>
      )
    },
    {
      title: 'ETCD服务',
      dataIndex: 'enableEtcd',
      key: 'enableEtcd',
      render: (enableEtcd: boolean, record: NodeInfo) => (
        <Switch
          checked={enableEtcd}
          onChange={(checked) => updateNodeEtcd(record.id, checked)}
          disabled={record.status !== 'connected'}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      )
    },
    {
      title: '系统信息',
      key: 'systemInfo',
      render: (_: any, record: NodeInfo) => {
        if (record.systemInfo) {
          return (
            <div>
              <div>{record.systemInfo.os}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {record.systemInfo.cpu} | {record.systemInfo.memory}
              </div>
            </div>
          );
        }
        return '-';
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: NodeInfo) => (
        <Space>
          <Button 
            size="small" 
            onClick={() => testConnection(record.id)}
            loading={testingNodes.has(record.id)}
            disabled={record.status === 'connected'}
          >
            测试连接
          </Button>
          <Button 
            size="small" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => removeNode(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="py-8">
            <Title level={4} className="mb-6">基础配置</Title>
            <Form form={form} layout="vertical">
              <Form.Item 
                label="集群名称" 
                required
                rules={[{ required: true, message: '请输入集群名称' }]}
              >
                <Input
                  value={clusterName}
                  onChange={(e) => setClusterName(e.target.value)}
                  placeholder="请输入集群名称，如：my-k8s-cluster"
                  style={{ width: 300 }}
                  size="large"
                />
              </Form.Item>
              
              <Form.Item label="接入模式" required>
                <Select<'Push' | 'Pull'>
                  value={accessMode}
                  onChange={setAccessMode}
                  style={{ width: 300 }}
                  size="large"
                >
                  <Option value="Push">Push模式</Option>
                  <Option value="Pull">Pull模式</Option>
                </Select>
              </Form.Item>
              
              <Form.Item label="K8S版本" required>
                <Select
                  value={k8sVersion}
                  onChange={setK8sVersion}
                  style={{ width: 300 }}
                  size="large"
                >
                  {k8sVersions.map(version => (
                    <Option key={version} value={version}>
                      Kubernetes {version}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
            
            <Alert
              message="配置说明"
              description={
                <div>
                  <div>• <strong>Push模式</strong>：Karmada主动推送资源到成员集群</div>
                  <div>• <strong>Pull模式</strong>：成员集群主动从Karmada拉取资源</div>
                  <div>• 将使用 Kubernetes {k8sVersion} 版本进行集群部署</div>
                </div>
              }
              type="info"
              showIcon
              className="mt-4"
            />
          </div>
        );

      case 1:
        return (
          <div className="py-4">
            <Title level={4} className="mb-4">配置集群节点</Title>
            
            {/* 添加节点表单 */}
            <Card title="添加节点" className="mb-4">
              <Form form={nodeForm} layout="inline">
                <Form.Item
                  name="ip"
                  label="IP地址"
                  rules={[
                    { required: true, message: '请输入IP地址' },
                    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入有效的IP地址' }
                  ]}
                >
                  <Input placeholder="192.168.1.100" />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="SSH密码"
                  rules={[{ required: true, message: '请输入SSH密码' }]}
                >
                  <Input.Password placeholder="SSH连接密码" />
                </Form.Item>
                <Form.Item name="role" label="节点角色" initialValue="worker">
                  <Select style={{ width: 120 }}>
                    <Option value="master">控制节点</Option>
                    <Option value="worker">工作节点</Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Button type="primary" icon={<PlusOutlined />} onClick={addNode}>
                    添加节点
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* 节点列表 */}
            <Card title={`节点列表 (${nodes.length})`}>
              <Table
                columns={nodeColumns}
                dataSource={nodes}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: '暂无节点，请先添加节点' }}
              />
            </Card>
          </div>
        );

      case 2:
        const masterNodes = nodes.filter(n => n.role === 'master');
        const workerNodes = nodes.filter(n => n.role === 'worker');
        const etcdNodes = nodes.filter(n => n.enableEtcd);
        
        return (
          <div className="py-4">
            <Title level={4} className="mb-4">节点角色分配</Title>
            
            {/* ETCD算法说明 */}
            <Alert
              message="ETCD节点配置说明"
              description="etcd数据采用Raft一致性算法，该算法决定了etcd节点数必须是奇数个（1、3、5、7...），以确保在网络分区时能够选举出leader节点。推荐生产环境使用3个或5个etcd节点。"
              type="info"
              showIcon
              className="mb-4"
            />
            
            <Row gutter={16}>
              <Col span={12}>
                <Card title="控制节点" className="mb-4">
                  <div className="mb-4">
                    <Text strong>数量: {masterNodes.length}</Text>
                    {masterNodes.length > 1 && (
                      <div className="mt-2">
                        <Switch
                          checked={enableHA}
                          onChange={setEnableHA}
                          checkedChildren="启用HA"
                          unCheckedChildren="单节点"
                        />
                        <Text className="ml-2" type="secondary">
                          启用高可用配置
                        </Text>
                      </div>
                    )}
                  </div>
                  {masterNodes.map(node => (
                    <div key={node.id} className="mb-2 p-2 border rounded">
                      <Text strong>{node.ip}</Text>
                      <Tag color="blue" className="ml-2">Master</Tag>
                      {node.enableEtcd && <Tag color="orange" className="ml-1">ETCD</Tag>}
                    </div>
                  ))}
                </Card>
              </Col>
              
              <Col span={12}>
                <Card title="工作节点">
                  <div className="mb-4">
                    <Text strong>数量: {workerNodes.length}</Text>
                  </div>
                  {workerNodes.map(node => (
                    <div key={node.id} className="mb-2 p-2 border rounded">
                      <Text strong>{node.ip}</Text>
                      <Tag color="green" className="ml-2">Worker</Tag>
                      {node.enableEtcd && <Tag color="orange" className="ml-1">ETCD</Tag>}
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>

            <div className="mt-4">
              <Alert
                message={`ETCD节点统计: 共${etcdNodes.length}个节点启用了ETCD服务`}
                description={`启用ETCD的节点: ${etcdNodes.map(n => n.ip).join(', ')}`}
                type="info"
                showIcon
              />
            </div>

            {enableHA && masterNodes.length > 1 && (
              <Alert
                message="高可用配置"
                description="将自动配置Nginx负载均衡器作为API Server的高可用代理，确保控制平面的高可用性。"
                type="success"
                showIcon
                className="mt-4"
              />
            )}
          </div>
        );

      case 3:
        return (
          <div className="py-4">
            <Title level={4} className="mb-4">部署配置确认</Title>
            
            <Descriptions bordered column={2} className="mb-6">
              <Descriptions.Item label="集群名称">{clusterName}</Descriptions.Item>
              <Descriptions.Item label="接入模式">{accessMode}模式</Descriptions.Item>
              <Descriptions.Item label="K8S版本">{k8sVersion}</Descriptions.Item>
              <Descriptions.Item label="节点总数">{nodes.length}</Descriptions.Item>
              <Descriptions.Item label="控制节点">{nodes.filter(n => n.role === 'master').length}</Descriptions.Item>
              <Descriptions.Item label="工作节点">{nodes.filter(n => n.role === 'worker').length}</Descriptions.Item>
              <Descriptions.Item label="ETCD节点">{nodes.filter(n => n.enableEtcd).length}</Descriptions.Item>
              <Descriptions.Item label="高可用">
                {enableHA ? '已启用' : '未启用'}
              </Descriptions.Item>
              <Descriptions.Item label="部署工具">Ansible</Descriptions.Item>
            </Descriptions>

            {isDeploying ? (
              <Card>
                <div className="text-center py-8">
                  <Spin size="large" />
                  <Title level={4} className="mt-4">正在部署集群...</Title>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${deploymentProgress}%` }}
                    />
                  </div>
                  <Text className="mt-2">部署进度: {Math.round(deploymentProgress)}%</Text>
                </div>
              </Card>
            ) : (
              <Alert
                message="准备就绪"
                description="所有配置已确认，点击开始部署按钮将使用Ansible自动化工具开始集群部署过程。"
                type="info"
                showIcon
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // 检查当前步骤是否可以继续
  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!k8sVersion && !!clusterName.trim();
      case 1:
        return nodes.length > 0 && nodes.every(n => n.status === 'connected');
      case 2:
        const masterCount = nodes.filter(n => n.role === 'master').length;
        const etcdCount = nodes.filter(n => n.enableEtcd).length;
        return masterCount > 0 && etcdCount > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <>
      {messageContextHolder}
      <Modal
        title="集群部署配置"
        open={open}
        width={1000}
        footer={null}
        onCancel={() => {
          onCancel();
          resetForm();
        }}
        destroyOnClose
      >
        <div className="py-4">
          <Steps current={currentStep} items={steps} className="mb-8" />
          
          <div style={{ minHeight: '400px' }}>
            {renderStepContent()}
          </div>

          <Divider />
          
          <div className="flex justify-between">
            <Button 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0 || isDeploying}
            >
              上一步
            </Button>
            
            <Space>
              <Button onClick={() => { onCancel(); resetForm(); }}>
                取消
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button 
                  type="primary" 
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                >
                  下一步
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={startDeployment}
                  disabled={!canProceed() || isDeploying}
                  loading={isDeploying}
                >
                  开始部署
                </Button>
              )}
            </Space>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ClusterDeployModal; 