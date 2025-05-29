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

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Card,
  Row,
  Col,
  message,
  Typography,
  Alert,
  Collapse,
  Badge,
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  InfoCircleOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  CloudOutlined,
  ApiOutlined,
  GlobalOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import i18nInstance from '@/utils/i18n';
import { CreateResource } from '@/services/unstructured';
import { IResponse, ServiceKind } from '@/services/base';
import { ServiceType, Protocol } from '@/services/service';
import { stringify } from 'yaml';
import useNamespace from '@/hooks/use-namespace';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;
const { Panel } = Collapse;

export interface ServiceWizardModalProps {
  open: boolean;
  kind: ServiceKind;
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

interface ServicePort {
  name?: string;
  port: number;
  targetPort: number;
  protocol: Protocol;
  nodePort?: number;
}

interface IngressRule {
  host?: string;
  path: string;
  pathType: 'Prefix' | 'Exact' | 'ImplementationSpecific';
  serviceName: string;
  servicePort: number;
}

interface ServiceConfig {
  metadata: {
    name: string;
    namespace: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
  };
  spec: {
    type: ServiceType;
    ports: ServicePort[];
    selector: Record<string, string>;
    sessionAffinity?: 'None' | 'ClientIP';
    externalTrafficPolicy?: 'Cluster' | 'Local';
    // Ingress specific
    ingressClassName?: string;
    rules: IngressRule[];
    tls?: Array<{
      secretName: string;
      hosts: string[];
    }>;
  };
}

const ServiceWizardModal: React.FC<ServiceWizardModalProps> = ({
  open,
  kind,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // 添加命名空间数据获取
  const { nsOptions, isNsDataLoading } = useNamespace({});
  
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig>({
    metadata: {
      name: '',
      namespace: 'default',
      labels: {},
      annotations: {},
    },
    spec: {
      type: ServiceType.ClusterIP,
      ports: [
        {
          name: 'http',
          port: 80,
          targetPort: 80,
          protocol: Protocol.TCP,
        },
      ],
      selector: {},
      rules: [
        {
          path: '/',
          pathType: 'Prefix' as const,
          serviceName: '',
          servicePort: 80,
        },
      ],
    },
  });

  const getServiceKindLabel = (kind: ServiceKind) => {
    const kindMap: Partial<Record<ServiceKind, string>> = {
      [ServiceKind.Service]: 'Service',
      [ServiceKind.Ingress]: 'Ingress',
    };
    return kindMap[kind] || kind;
  };

  const getServiceDescription = (kind: ServiceKind) => {
    const descriptions: Partial<Record<ServiceKind, string>> = {
      [ServiceKind.Service]: '为Pod提供稳定的网络端点和负载均衡',
      [ServiceKind.Ingress]: '提供HTTP/HTTPS路由规则，管理外部访问',
    };
    return descriptions[kind] || '';
  };

  const getServiceIcon = (kind: ServiceKind) => {
    const icons: Partial<Record<ServiceKind, React.ReactElement>> = {
      [ServiceKind.Service]: <CloudOutlined />,
      [ServiceKind.Ingress]: <GlobalOutlined />,
    };
    return icons[kind] || <CloudOutlined />;
  };

  // 重置配置到默认值
  useEffect(() => {
    if (open) {
      setServiceConfig(prev => ({
        ...prev,
        spec: {
          ...prev.spec,
          ...(kind === ServiceKind.Service && {
            type: ServiceType.ClusterIP,
            ports: [
              {
                name: 'http',
                port: 80,
                targetPort: 80,
                protocol: Protocol.TCP,
              },
            ],
            selector: {},
          }),
          ...(kind === ServiceKind.Ingress && {
            ingressClassName: 'nginx',
            rules: [
              {
                path: '/',
                pathType: 'Prefix' as const,
                serviceName: '',
                servicePort: 80,
              },
            ],
          }),
        },
      }));
    }
  }, [open, kind]);

  const generateYAML = (config: ServiceConfig) => {
    const kindLabel = getServiceKindLabel(kind);
    let apiVersion = 'v1';
    
    if (kind === ServiceKind.Ingress) {
      apiVersion = 'networking.k8s.io/v1';
    }

    const baseMetadata = {
      name: config.metadata.name,
      namespace: config.metadata.namespace,
      labels: {
        app: config.metadata.name,
        ...config.metadata.labels,
      },
      ...(Object.keys(config.metadata.annotations).length > 0 && {
        annotations: config.metadata.annotations,
      }),
    };

    if (kind === ServiceKind.Service) {
      return {
        apiVersion,
        kind: 'Service',
        metadata: baseMetadata,
        spec: {
          type: config.spec.type,
          ports: config.spec.ports.map(port => ({
            name: port.name,
            port: port.port,
            targetPort: port.targetPort,
            protocol: port.protocol,
            ...(config.spec.type === ServiceType.NodePort && port.nodePort && {
              nodePort: port.nodePort,
            }),
          })),
          selector: config.spec.selector,
          ...(config.spec.sessionAffinity && {
            sessionAffinity: config.spec.sessionAffinity,
          }),
          ...(config.spec.externalTrafficPolicy && 
              (config.spec.type === ServiceType.NodePort || config.spec.type === ServiceType.LoadBalancer) && {
            externalTrafficPolicy: config.spec.externalTrafficPolicy,
          }),
        },
      };
    }

    // Ingress
    return {
      apiVersion,
      kind: 'Ingress',
      metadata: baseMetadata,
      spec: {
        ...(config.spec.ingressClassName && {
          ingressClassName: config.spec.ingressClassName,
        }),
        rules: config.spec.rules.map(rule => ({
          ...(rule.host && { host: rule.host }),
          http: {
            paths: [
              {
                path: rule.path,
                pathType: rule.pathType,
                backend: {
                  service: {
                    name: rule.serviceName,
                    port: {
                      number: rule.servicePort,
                    },
                  },
                },
              },
            ],
          },
        })),
        ...(config.spec.tls && config.spec.tls.length > 0 && {
          tls: config.spec.tls,
        }),
      },
    };
  };

  const handleNext = async () => {
    try {
      await form.validateFields();
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        await handleSubmit();
      }
    } catch (error) {
      message.error('请填写必填字段');
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const yamlObject = generateYAML(serviceConfig);
      
      const ret = await CreateResource({
        kind: getServiceKindLabel(kind),
        name: serviceConfig.metadata.name,
        namespace: serviceConfig.metadata.namespace,
        content: yamlObject,
      });

      await onOk(ret);
      handleReset();
    } catch (error) {
      console.error('创建服务失败:', error);
      message.error('创建服务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    form.resetFields();
    const defaultConfig = {
      metadata: {
        name: '',
        namespace: 'default',
        labels: {},
        annotations: {},
      },
      spec: {
        type: ServiceType.ClusterIP,
        ports: [
          {
            name: 'http',
            port: 80,
            targetPort: 80,
            protocol: Protocol.TCP,
          },
        ],
        selector: {},
        rules: [
          {
            path: '/',
            pathType: 'Prefix' as const,
            serviceName: '',
            servicePort: 80,
          },
        ],
      },
    };
    setServiceConfig(defaultConfig);
    // 重置表单字段值
    form.setFieldsValue({
      name: '',
      namespace: 'default',
      serviceType: ServiceType.ClusterIP,
      sessionAffinity: 'None',
      externalTrafficPolicy: 'Cluster',
      ingressClassName: 'nginx',
    });
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  const updateServiceConfig = (path: string, value: any) => {
    setServiceConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const addPort = () => {
    const newConfig = { ...serviceConfig };
    newConfig.spec.ports.push({
      name: `port-${newConfig.spec.ports.length + 1}`,
      port: 80,
      targetPort: 80,
      protocol: Protocol.TCP,
    });
    setServiceConfig(newConfig);
  };

  const removePort = (index: number) => {
    const newConfig = { ...serviceConfig };
    newConfig.spec.ports.splice(index, 1);
    setServiceConfig(newConfig);
  };

  const updatePort = (index: number, field: string, value: any) => {
    const newConfig = { ...serviceConfig };
    const keys = field.split('.');
    let current: any = newConfig.spec.ports[index];
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setServiceConfig(newConfig);
  };

  const addRule = () => {
    const newConfig = { ...serviceConfig };
    newConfig.spec.rules.push({
      path: '/',
      pathType: 'Prefix' as const,
      serviceName: '',
      servicePort: 80,
    });
    setServiceConfig(newConfig);
  };

  const removeRule = (index: number) => {
    const newConfig = { ...serviceConfig };
    newConfig.spec.rules.splice(index, 1);
    setServiceConfig(newConfig);
  };

  const updateRule = (index: number, field: string, value: any) => {
    const newConfig = { ...serviceConfig };
    const keys = field.split('.');
    let current: any = newConfig.spec.rules[index];
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setServiceConfig(newConfig);
  };

  const renderBasicConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      <Alert
        message={
          <Space>
            {getServiceIcon(kind)}
            <Text strong>{getServiceKindLabel(kind)}</Text>
          </Space>
        }
        description={getServiceDescription(kind)}
        type="info"
        showIcon={false}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <Form form={form} layout="vertical" size="large">
        <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="服务名称"
                name="name"
                initialValue={serviceConfig.metadata.name}
                rules={[
                  { required: true, message: '请输入服务名称' },
                  { pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, message: '名称只能包含小写字母、数字和连字符' }
                ]}
              >
                <Input
                  placeholder="输入服务名称"
                  onChange={(e) => {
                    updateServiceConfig('metadata.name', e.target.value);
                    form.setFieldValue('name', e.target.value);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="命名空间"
                name="namespace"
                initialValue={serviceConfig.metadata.namespace}
                rules={[{ required: true, message: '请输入命名空间' }]}
              >
                <Select
                  placeholder="选择命名空间"
                  onChange={(value) => {
                    updateServiceConfig('metadata.namespace', value);
                    form.setFieldValue('namespace', value);
                  }}
                  loading={isNsDataLoading}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {nsOptions.map((ns: any) => (
                    <Option key={ns.value} value={ns.value}>
                      {ns.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 服务特定配置 */}
        {renderServiceSpecificConfig()}
      </Form>
    </div>
  );

  const renderServiceSpecificConfig = () => {
    if (kind === ServiceKind.Service) {
      return (
        <Card title="Service 配置" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="服务类型" name="serviceType">
                <Select
                  value={serviceConfig.spec.type}
                  onChange={(value) => updateServiceConfig('spec.type', value)}
                >
                  <Option value={ServiceType.ClusterIP}>ClusterIP</Option>
                  <Option value={ServiceType.NodePort}>NodePort</Option>
                  <Option value={ServiceType.LoadBalancer}>LoadBalancer</Option>
                  <Option value={ServiceType.ExternalName}>ExternalName</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="会话亲和性" name="sessionAffinity">
                <Select
                  value={serviceConfig.spec.sessionAffinity || 'None'}
                  onChange={(value) => updateServiceConfig('spec.sessionAffinity', value)}
                >
                  <Option value="None">None</Option>
                  <Option value="ClientIP">ClientIP</Option>
                </Select>
              </Form.Item>
            </Col>
            {(serviceConfig.spec.type === ServiceType.NodePort || 
              serviceConfig.spec.type === ServiceType.LoadBalancer) && (
              <Col span={8}>
                <Form.Item label="外部流量策略" name="externalTrafficPolicy">
                  <Select
                    value={serviceConfig.spec.externalTrafficPolicy || 'Cluster'}
                    onChange={(value) => updateServiceConfig('spec.externalTrafficPolicy', value)}
                  >
                    <Option value="Cluster">Cluster</Option>
                    <Option value="Local">Local</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>
      );
    } else {
      return (
        <Card title="Ingress 配置" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Ingress 类名" name="ingressClassName">
                <Input
                  placeholder="例如: nginx"
                  value={serviceConfig.spec.ingressClassName}
                  onChange={(e) => updateServiceConfig('spec.ingressClassName', e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      );
    }
  };

  const renderPortConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      {kind === ServiceKind.Service ? (
        <Card
          title={
            <Space>
              <ApiOutlined />
              <Text>端口配置</Text>
              <Badge count={serviceConfig.spec.ports.length} size="small" />
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          {serviceConfig.spec.ports.map((port, portIndex) => (
            <div
              key={portIndex}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Space>
                  <Badge count={portIndex + 1} size="small" style={{ backgroundColor: '#1890ff' }}>
                    <div style={{ width: 16, height: 16 }} />
                  </Badge>
                  <Text strong>{port.name || `端口 ${portIndex + 1}`}</Text>
                </Space>
                {serviceConfig.spec.ports.length > 1 && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removePort(portIndex)}
                  >
                    删除
                  </Button>
                )}
              </div>

              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Form.Item label="端口名称" style={{ marginBottom: 8 }}>
                    <Input
                      size="small"
                      value={port.name}
                      onChange={(e) => updatePort(portIndex, 'name', e.target.value)}
                      placeholder="例如: http"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="协议" style={{ marginBottom: 8 }}>
                    <Select
                      size="small"
                      value={port.protocol}
                      onChange={(value) => updatePort(portIndex, 'protocol', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value={Protocol.TCP}>TCP</Option>
                      <Option value={Protocol.UDP}>UDP</Option>
                      <Option value={Protocol.SCTP}>SCTP</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 8]}>
                <Col span={serviceConfig.spec.type === ServiceType.NodePort ? 8 : 12}>
                  <Form.Item label="端口" required style={{ marginBottom: 8 }}>
                    <InputNumber
                      size="small"
                      value={port.port}
                      onChange={(value) => updatePort(portIndex, 'port', value || 80)}
                      style={{ width: '100%' }}
                      min={1}
                      max={65535}
                      placeholder="80"
                    />
                  </Form.Item>
                </Col>
                <Col span={serviceConfig.spec.type === ServiceType.NodePort ? 8 : 12}>
                  <Form.Item label="目标端口" required style={{ marginBottom: 8 }}>
                    <InputNumber
                      size="small"
                      value={port.targetPort}
                      onChange={(value) => updatePort(portIndex, 'targetPort', value || 80)}
                      style={{ width: '100%' }}
                      min={1}
                      max={65535}
                      placeholder="80"
                    />
                  </Form.Item>
                </Col>
                {serviceConfig.spec.type === ServiceType.NodePort && (
                  <Col span={8}>
                    <Form.Item label="NodePort" style={{ marginBottom: 8 }}>
                      <InputNumber
                        size="small"
                        value={port.nodePort}
                        onChange={(value) => updatePort(portIndex, 'nodePort', value)}
                        style={{ width: '100%' }}
                        min={30000}
                        max={32767}
                        placeholder="30000-32767"
                      />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </div>
          ))}
          
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addPort}
            style={{ width: '100%', marginTop: 8 }}
            size="middle"
          >
            添加端口
          </Button>
        </Card>
      ) : (
        <Card
          title={
            <Space>
              <LinkOutlined />
              <Text>路由规则</Text>
              <Badge count={serviceConfig.spec.rules.length} size="small" />
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          {serviceConfig.spec.rules.map((rule, ruleIndex) => (
            <div
              key={ruleIndex}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Space>
                  <Badge count={ruleIndex + 1} size="small" style={{ backgroundColor: '#1890ff' }}>
                    <div style={{ width: 16, height: 16 }} />
                  </Badge>
                  <Text strong>{rule.host || `规则 ${ruleIndex + 1}`}</Text>
                </Space>
                {serviceConfig.spec.rules.length > 1 && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeRule(ruleIndex)}
                  >
                    删除
                  </Button>
                )}
              </div>

              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Form.Item label="主机名" style={{ marginBottom: 8 }}>
                    <Input
                      size="small"
                      value={rule.host}
                      onChange={(e) => updateRule(ruleIndex, 'host', e.target.value)}
                      placeholder="example.com"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="路径类型" style={{ marginBottom: 8 }}>
                    <Select
                      size="small"
                      value={rule.pathType}
                      onChange={(value) => updateRule(ruleIndex, 'pathType', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="Prefix">Prefix</Option>
                      <Option value="Exact">Exact</Option>
                      <Option value="ImplementationSpecific">ImplementationSpecific</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 8]}>
                <Col span={24}>
                  <Form.Item label="路径" required style={{ marginBottom: 8 }}>
                    <Input
                      size="small"
                      value={rule.path}
                      onChange={(e) => updateRule(ruleIndex, 'path', e.target.value)}
                      placeholder="/"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 8]}>
                <Col span={16}>
                  <Form.Item label="后端服务名" required style={{ marginBottom: 8 }}>
                    <Input
                      size="small"
                      value={rule.serviceName}
                      onChange={(e) => updateRule(ruleIndex, 'serviceName', e.target.value)}
                      placeholder="backend-service"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="服务端口" required style={{ marginBottom: 8 }}>
                    <InputNumber
                      size="small"
                      value={rule.servicePort}
                      onChange={(value) => updateRule(ruleIndex, 'servicePort', value || 80)}
                      style={{ width: '100%' }}
                      min={1}
                      max={65535}
                      placeholder="80"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          ))}
          
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addRule}
            style={{ width: '100%', marginTop: 8 }}
            size="middle"
          >
            添加规则
          </Button>
        </Card>
      )}
    </div>
  );

  const renderAdvancedConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      {kind === ServiceKind.Service && (
        <Card title="选择器配置" size="small" style={{ marginBottom: 16 }}>
          <Alert
            message="选择器用于匹配Pod标签，确定Service后端"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              const key = `app`;
              updateServiceConfig(`spec.selector.${key}`, serviceConfig.metadata.name);
            }}
            style={{ marginBottom: 8 }}
            size="small"
          >
            添加选择器
          </Button>
          {Object.entries(serviceConfig.spec.selector).map(([key, value]) => (
            <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
              <Col span={10}>
                <Input
                  placeholder="选择器键"
                  value={key}
                  onChange={(e) => {
                    const newConfig = { ...serviceConfig };
                    delete newConfig.spec.selector[key];
                    newConfig.spec.selector[e.target.value] = value;
                    setServiceConfig(newConfig);
                  }}
                />
              </Col>
              <Col span={10}>
                <Input
                  placeholder="选择器值"
                  value={value}
                  onChange={(e) => updateServiceConfig(`spec.selector.${key}`, e.target.value)}
                />
              </Col>
              <Col span={4}>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const newConfig = { ...serviceConfig };
                    delete newConfig.spec.selector[key];
                    setServiceConfig(newConfig);
                  }}
                />
              </Col>
            </Row>
          ))}
        </Card>
      )}

      <Card title="标签和注解" size="small" style={{ marginBottom: 16 }}>
        <Collapse ghost>
          <Panel header="标签 (Labels)" key="labels">
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                const key = `label-${Date.now()}`;
                updateServiceConfig(`metadata.labels.${key}`, '');
              }}
              style={{ marginBottom: 8 }}
              size="small"
            >
              添加标签
            </Button>
            {Object.entries(serviceConfig.metadata.labels).map(([key, value]) => (
              key !== 'app' && (
                <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Input
                      placeholder="标签键"
                      value={key}
                      onChange={(e) => {
                        const newConfig = { ...serviceConfig };
                        delete newConfig.metadata.labels[key];
                        newConfig.metadata.labels[e.target.value] = value;
                        setServiceConfig(newConfig);
                      }}
                    />
                  </Col>
                  <Col span={10}>
                    <Input
                      placeholder="标签值"
                      value={value}
                      onChange={(e) => updateServiceConfig(`metadata.labels.${key}`, e.target.value)}
                    />
                  </Col>
                  <Col span={4}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const newConfig = { ...serviceConfig };
                        delete newConfig.metadata.labels[key];
                        setServiceConfig(newConfig);
                      }}
                    />
                  </Col>
                </Row>
              )
            ))}
          </Panel>

          <Panel header="注解 (Annotations)" key="annotations">
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                const key = `annotation-${Date.now()}`;
                updateServiceConfig(`metadata.annotations.${key}`, '');
              }}
              style={{ marginBottom: 8 }}
              size="small"
            >
              添加注解
            </Button>
            {Object.entries(serviceConfig.metadata.annotations).map(([key, value]) => (
              <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                <Col span={10}>
                  <Input
                    placeholder="注解键"
                    value={key}
                    onChange={(e) => {
                      const newConfig = { ...serviceConfig };
                      delete newConfig.metadata.annotations[key];
                      newConfig.metadata.annotations[e.target.value] = value;
                      setServiceConfig(newConfig);
                    }}
                  />
                </Col>
                <Col span={10}>
                  <Input
                    placeholder="注解值"
                    value={value}
                    onChange={(e) => updateServiceConfig(`metadata.annotations.${key}`, e.target.value)}
                  />
                </Col>
                <Col span={4}>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const newConfig = { ...serviceConfig };
                      delete newConfig.metadata.annotations[key];
                      setServiceConfig(newConfig);
                    }}
                  />
                </Col>
              </Row>
            ))}
          </Panel>
        </Collapse>
      </Card>
    </div>
  );

  const renderPreview = () => {
    const yamlObject = generateYAML(serviceConfig);
    const yamlContent = stringify(yamlObject);
    
    // 计算端口信息显示
    const getPortsInfo = () => {
      if (kind === ServiceKind.Service) {
        return `端口数: ${serviceConfig.spec.ports.length} | 类型: ${serviceConfig.spec.type}`;
      } else {
        return `规则数: ${serviceConfig.spec.rules.length} | 类: ${serviceConfig.spec.ingressClassName || '未设置'}`;
      }
    };
    
    return (
      <div style={{ height: '500px' }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              配置预览
            </Space>
          </Title>
          <Button
            type="link"
            onClick={() => {
              navigator.clipboard.writeText(yamlContent);
              message.success('YAML 已复制到剪贴板');
            }}
          >
            复制 YAML
          </Button>
        </Space>
        
        <Alert
          message={`即将创建 ${getServiceKindLabel(kind)}: ${serviceConfig.metadata.name}`}
          description={`命名空间: ${serviceConfig.metadata.namespace} | ${getPortsInfo()}`}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <TextArea
          value={yamlContent}
          rows={18}
          readOnly
          style={{ 
            fontFamily: '"Microsoft YaHei", "微软雅黑", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", Arial, sans-serif',
            fontSize: '13px',
            lineHeight: '1.4',
            backgroundColor: '#f6f8fa',
          }}
        />
      </div>
    );
  };

  const steps = [
    {
      title: '基本配置',
      description: '设置服务基本信息',
      content: renderBasicConfig(),
      icon: <SettingOutlined />,
    },
    {
      title: kind === ServiceKind.Service ? '端口配置' : '路由配置',
      description: kind === ServiceKind.Service ? '配置服务端口和协议' : '配置路由规则和后端服务',
      content: renderPortConfig(),
      icon: kind === ServiceKind.Service ? <ApiOutlined /> : <LinkOutlined />,
    },
    {
      title: '高级配置',
      description: kind === ServiceKind.Service ? '选择器、标签和注解' : '标签和注解配置',
      content: renderAdvancedConfig(),
      icon: <CloudOutlined />,
    },
    {
      title: '配置预览',
      description: '检查并确认配置',
      content: renderPreview(),
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          {getServiceIcon(kind)}
          <Text strong style={{ fontSize: '16px' }}>
            创建 {getServiceKindLabel(kind)}
          </Text>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={1200}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text type="secondary">
              步骤 {currentStep + 1} / {steps.length}
            </Text>
          </div>
          <Space>
            <Button onClick={handleCancel}>
              取消
            </Button>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                上一步
              </Button>
            )}
            <Button
              type="primary"
              onClick={handleNext}
              loading={loading}
            >
              {currentStep === steps.length - 1 ? '创建' : '下一步'}
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
      styles={{
        body: { padding: '24px 24px 0' }
      }}
    >
      <Steps 
        current={currentStep} 
        style={{ marginBottom: 24 }}
        items={steps.map(step => ({
          title: step.title,
          description: step.description,
          icon: step.icon,
        }))}
      />
      
      <div style={{ minHeight: 520, backgroundColor: '#fafafa', borderRadius: 8, padding: 16 }}>
        {steps[currentStep].content}
      </div>
    </Modal>
  );
};

export default ServiceWizardModal; 