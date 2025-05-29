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
  Switch,
  message,
  Divider,
  Tabs,
  Tooltip,
  Typography,
  Alert,
  Tag,
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
  DatabaseOutlined,
  ScheduleOutlined,
  BugOutlined,
} from '@ant-design/icons';
import i18nInstance from '@/utils/i18n';
import { CreateResource } from '@/services/unstructured';
import { IResponse, WorkloadKind } from '@/services/base';
import { stringify } from 'yaml';
import useNamespace from '@/hooks/use-namespace';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;
const { Panel } = Collapse;

export interface WorkloadWizardModalProps {
  open: boolean;
  kind: WorkloadKind;
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

interface HealthCheck {
  enabled: boolean;
  type: 'http' | 'tcp' | 'exec';
  httpPath?: string;
  port?: number;
  command?: string;
  initialDelaySeconds: number;
  periodSeconds: number;
  timeoutSeconds: number;
  successThreshold: number;
  failureThreshold: number;
}

interface ContainerConfig {
  name: string;
  image: string;
  imagePullPolicy: string;
  ports: Array<{
    containerPort: number;
    protocol: string;
    name?: string;
  }>;
  env: Array<{
    name: string;
    value: string;
  }>;
  resources: {
    requests: {
      cpu: string;
      memory: string;
    };
    limits: {
      cpu: string;
      memory: string;
    };
  };
  livenessProbe?: HealthCheck;
  readinessProbe?: HealthCheck;
}

interface WorkloadSpecificConfig {
  // Deployment specific
  strategy?: {
    type: 'RollingUpdate' | 'Recreate';
    maxUnavailable?: string;
    maxSurge?: string;
  };
  
  // StatefulSet specific
  serviceName?: string;
  podManagementPolicy?: 'OrderedReady' | 'Parallel';
  
  // Job specific
  parallelism?: number;
  completions?: number;
  backoffLimit?: number;
  activeDeadlineSeconds?: number;
  ttlSecondsAfterFinished?: number;
  
  // CronJob specific
  concurrencyPolicy?: 'Allow' | 'Forbid' | 'Replace';
  successfulJobsHistoryLimit?: number;
  failedJobsHistoryLimit?: number;
  startingDeadlineSeconds?: number;
  timezone?: string;
}

interface WorkloadConfig {
  metadata: {
    name: string;
    namespace: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
  };
  spec: {
    replicas: number;
    containers: ContainerConfig[];
    restartPolicy?: string;
    schedule?: string;
    nodeSelector?: Record<string, string>;
  } & WorkloadSpecificConfig;
}

const WorkloadWizardModal: React.FC<WorkloadWizardModalProps> = ({
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
  
  const [workloadConfig, setWorkloadConfig] = useState<WorkloadConfig>({
    metadata: {
      name: '',
      namespace: 'default',
      labels: {},
      annotations: {},
    },
    spec: {
      replicas: 1,
      containers: [
        {
          name: 'container-1',
          image: '',
          imagePullPolicy: 'IfNotPresent',
          ports: [],
          env: [],
          resources: {
            requests: {
              cpu: '100m',
              memory: '128Mi',
            },
            limits: {
              cpu: '500m',
              memory: '512Mi',
            },
          },
        },
      ],
    },
  });

  const getWorkloadKindLabel = (kind: WorkloadKind) => {
    const kindMap: Partial<Record<WorkloadKind, string>> = {
      [WorkloadKind.Deployment]: 'Deployment',
      [WorkloadKind.Statefulset]: 'StatefulSet',
      [WorkloadKind.Daemonset]: 'DaemonSet',
      [WorkloadKind.Job]: 'Job',
      [WorkloadKind.Cronjob]: 'CronJob',
    };
    return kindMap[kind] || kind;
  };

  const getWorkloadDescription = (kind: WorkloadKind) => {
    const descriptions: Partial<Record<WorkloadKind, string>> = {
      [WorkloadKind.Deployment]: '无状态应用部署，支持滚动更新和弹性扩缩容',
      [WorkloadKind.Statefulset]: '有状态应用部署，提供稳定的网络标识和持久化存储',
      [WorkloadKind.Daemonset]: '守护进程集，在每个节点上运行一个Pod副本',
      [WorkloadKind.Job]: '一次性任务，运行完成后退出',
      [WorkloadKind.Cronjob]: '定时任务，按照Cron表达式定期执行',
    };
    return descriptions[kind] || '';
  };

  const getWorkloadIcon = (kind: WorkloadKind) => {
    const icons: Partial<Record<WorkloadKind, React.ReactElement>> = {
      [WorkloadKind.Deployment]: <CloudOutlined />,
      [WorkloadKind.Statefulset]: <DatabaseOutlined />,
      [WorkloadKind.Daemonset]: <SettingOutlined />,
      [WorkloadKind.Job]: <CheckCircleOutlined />,
      [WorkloadKind.Cronjob]: <ScheduleOutlined />,
    };
    return icons[kind] || <CloudOutlined />;
  };

  // 重置配置到默认值
  useEffect(() => {
    if (open) {
      setWorkloadConfig(prev => ({
        ...prev,
        spec: {
          ...prev.spec,
          // 根据工作负载类型设置默认值
          ...(kind === WorkloadKind.Deployment && {
            strategy: {
              type: 'RollingUpdate',
              maxUnavailable: '25%',
              maxSurge: '25%',
            },
          }),
          ...(kind === WorkloadKind.Statefulset && {
            serviceName: '',
            podManagementPolicy: 'OrderedReady',
          }),
          ...(kind === WorkloadKind.Job && {
            parallelism: 1,
            completions: 1,
            backoffLimit: 6,
            restartPolicy: 'Never',
          }),
          ...(kind === WorkloadKind.Cronjob && {
            schedule: '0 0 * * *',
            concurrencyPolicy: 'Allow',
            successfulJobsHistoryLimit: 3,
            failedJobsHistoryLimit: 1,
          }),
        },
      }));
    }
  }, [open, kind]);

  const generateYAML = (config: WorkloadConfig) => {
    const kindLabel = getWorkloadKindLabel(kind);
    let apiVersion = 'apps/v1';
    
    if (kind === WorkloadKind.Cronjob) {
      apiVersion = 'batch/v1';
    } else if (kind === WorkloadKind.Job) {
      apiVersion = 'batch/v1';
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

    const containerSpecs = config.spec.containers.map(container => ({
      name: container.name,
      image: container.image,
      imagePullPolicy: container.imagePullPolicy,
      ...(container.ports.length > 0 && { ports: container.ports }),
      ...(container.env.length > 0 && { env: container.env }),
      resources: container.resources,
      ...(container.livenessProbe?.enabled && {
        livenessProbe: generateProbe(container.livenessProbe),
      }),
      ...(container.readinessProbe?.enabled && {
        readinessProbe: generateProbe(container.readinessProbe),
      }),
    }));

    if (kind === WorkloadKind.Cronjob) {
      return {
        apiVersion,
        kind: 'CronJob',
        metadata: baseMetadata,
        spec: {
          schedule: config.spec.schedule || '0 0 * * *',
          concurrencyPolicy: config.spec.concurrencyPolicy || 'Allow',
          successfulJobsHistoryLimit: config.spec.successfulJobsHistoryLimit || 3,
          failedJobsHistoryLimit: config.spec.failedJobsHistoryLimit || 1,
          ...(config.spec.startingDeadlineSeconds && {
            startingDeadlineSeconds: config.spec.startingDeadlineSeconds,
          }),
          ...(config.spec.timezone && { timeZone: config.spec.timezone }),
          jobTemplate: {
            spec: {
              ...(config.spec.activeDeadlineSeconds && {
                activeDeadlineSeconds: config.spec.activeDeadlineSeconds,
              }),
              ...(config.spec.ttlSecondsAfterFinished && {
                ttlSecondsAfterFinished: config.spec.ttlSecondsAfterFinished,
              }),
              template: {
                metadata: {
                  labels: { app: config.metadata.name },
                },
                spec: {
                  containers: containerSpecs,
                  restartPolicy: 'OnFailure',
                  ...(Object.keys(config.spec.nodeSelector || {}).length > 0 && {
                    nodeSelector: config.spec.nodeSelector,
                  }),
                },
              },
            },
          },
        },
      };
    }

    if (kind === WorkloadKind.Job) {
      return {
        apiVersion,
        kind: 'Job',
        metadata: baseMetadata,
        spec: {
          parallelism: config.spec.parallelism || 1,
          completions: config.spec.completions || 1,
          backoffLimit: config.spec.backoffLimit || 6,
          ...(config.spec.activeDeadlineSeconds && {
            activeDeadlineSeconds: config.spec.activeDeadlineSeconds,
          }),
          ...(config.spec.ttlSecondsAfterFinished && {
            ttlSecondsAfterFinished: config.spec.ttlSecondsAfterFinished,
          }),
          template: {
            metadata: {
              labels: { app: config.metadata.name },
            },
            spec: {
              containers: containerSpecs,
              restartPolicy: config.spec.restartPolicy || 'Never',
              ...(Object.keys(config.spec.nodeSelector || {}).length > 0 && {
                nodeSelector: config.spec.nodeSelector,
              }),
            },
          },
        },
      };
    }

    // Deployment, StatefulSet, DaemonSet
    const baseSpec: any = {
      selector: {
        matchLabels: { app: config.metadata.name },
      },
      template: {
        metadata: {
          labels: { app: config.metadata.name },
        },
        spec: {
          containers: containerSpecs,
          ...(Object.keys(config.spec.nodeSelector || {}).length > 0 && {
            nodeSelector: config.spec.nodeSelector,
          }),
        },
      },
    };

    if (kind === WorkloadKind.Deployment) {
      baseSpec.replicas = config.spec.replicas;
      if (config.spec.strategy) {
        baseSpec.strategy = {
          type: config.spec.strategy.type,
          ...(config.spec.strategy.type === 'RollingUpdate' && {
            rollingUpdate: {
              maxUnavailable: config.spec.strategy.maxUnavailable,
              maxSurge: config.spec.strategy.maxSurge,
            },
          }),
        };
      }
    } else if (kind === WorkloadKind.Statefulset) {
      baseSpec.replicas = config.spec.replicas;
      baseSpec.serviceName = config.spec.serviceName || config.metadata.name;
      baseSpec.podManagementPolicy = config.spec.podManagementPolicy || 'OrderedReady';
    }
    // DaemonSet 不需要 replicas

    return {
      apiVersion,
      kind: kindLabel,
      metadata: baseMetadata,
      spec: baseSpec,
    };
  };

  const generateProbe = (probe: HealthCheck) => {
    const baseProbe = {
      initialDelaySeconds: probe.initialDelaySeconds,
      periodSeconds: probe.periodSeconds,
      timeoutSeconds: probe.timeoutSeconds,
      successThreshold: probe.successThreshold,
      failureThreshold: probe.failureThreshold,
    };

    switch (probe.type) {
      case 'http':
        return {
          ...baseProbe,
          httpGet: {
            path: probe.httpPath || '/',
            port: probe.port || 80,
          },
        };
      case 'tcp':
        return {
          ...baseProbe,
          tcpSocket: {
            port: probe.port || 80,
          },
        };
      case 'exec':
        return {
          ...baseProbe,
          exec: {
            command: probe.command?.split(' ') || ['echo', 'hello'],
          },
        };
      default:
        return baseProbe;
    }
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
      const yamlObject = generateYAML(workloadConfig);
      
      const ret = await CreateResource({
        kind: getWorkloadKindLabel(kind),
        name: workloadConfig.metadata.name,
        namespace: workloadConfig.metadata.namespace,
        content: yamlObject,
      });

      await onOk(ret);
      handleReset();
    } catch (error) {
      console.error('创建工作负载失败:', error);
      message.error('创建工作负载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    form.resetFields();
    setWorkloadConfig({
      metadata: {
        name: '',
        namespace: 'default',
        labels: {},
        annotations: {},
      },
      spec: {
        replicas: 1,
        containers: [
          {
            name: 'container-1',
            image: '',
            imagePullPolicy: 'IfNotPresent',
            ports: [],
            env: [],
            resources: {
              requests: {
                cpu: '100m',
                memory: '128Mi',
              },
              limits: {
                cpu: '500m',
                memory: '512Mi',
              },
            },
          },
        ],
      },
    });
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  const updateWorkloadConfig = (path: string, value: any) => {
    setWorkloadConfig(prev => {
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

  const addContainer = () => {
    const newConfig = { ...workloadConfig };
    newConfig.spec.containers.push({
      name: `container-${newConfig.spec.containers.length + 1}`,
      image: '',
      imagePullPolicy: 'IfNotPresent',
      ports: [],
      env: [],
      resources: {
        requests: { cpu: '100m', memory: '128Mi' },
        limits: { cpu: '500m', memory: '512Mi' },
      },
    });
    setWorkloadConfig(newConfig);
  };

  const removeContainer = (index: number) => {
    const newConfig = { ...workloadConfig };
    newConfig.spec.containers.splice(index, 1);
    setWorkloadConfig(newConfig);
  };

  const updateContainer = (index: number, field: string, value: any) => {
    const newConfig = { ...workloadConfig };
    const keys = field.split('.');
    let current: any = newConfig.spec.containers[index];
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setWorkloadConfig(newConfig);
  };

  const renderBasicConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      <Alert
        message={
          <Space>
            {getWorkloadIcon(kind)}
            <Text strong>{getWorkloadKindLabel(kind)}</Text>
          </Space>
        }
        description={getWorkloadDescription(kind)}
        type="info"
        showIcon={false}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <Form form={form} layout="vertical" size="large">
        <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="工作负载名称"
                name="name"
                rules={[
                  { required: true, message: '请输入工作负载名称' },
                  { pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, message: '名称只能包含小写字母、数字和连字符' }
                ]}
              >
                <Input
                  placeholder="输入工作负载名称"
                  value={workloadConfig.metadata.name}
                  onChange={(e) => updateWorkloadConfig('metadata.name', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="命名空间"
                name="namespace"
                rules={[{ required: true, message: '请输入命名空间' }]}
              >
                <Select
                  placeholder="选择命名空间"
                  value={workloadConfig.metadata.namespace}
                  onChange={(value) => updateWorkloadConfig('metadata.namespace', value)}
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

        {/* 工作负载特定配置 */}
        {renderWorkloadSpecificConfig()}
      </Form>
    </div>
  );

  const renderWorkloadSpecificConfig = () => {
    switch (kind) {
      case WorkloadKind.Deployment:
        return (
          <Card title="Deployment 配置" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="副本数" name="replicas">
                  <InputNumber
                    min={1}
                    max={100}
                    value={workloadConfig.spec.replicas}
                    onChange={(value) => updateWorkloadConfig('spec.replicas', value || 1)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="更新策略" name="strategyType">
                  <Select
                    value={workloadConfig.spec.strategy?.type || 'RollingUpdate'}
                    onChange={(value) => updateWorkloadConfig('spec.strategy.type', value)}
                  >
                    <Option value="RollingUpdate">滚动更新</Option>
                    <Option value="Recreate">重新创建</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            {workloadConfig.spec.strategy?.type === 'RollingUpdate' && (
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="最大不可用" name="maxUnavailable">
                    <Input
                      placeholder="25%"
                      value={workloadConfig.spec.strategy?.maxUnavailable}
                      onChange={(e) => updateWorkloadConfig('spec.strategy.maxUnavailable', e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="最大激增" name="maxSurge">
                    <Input
                      placeholder="25%"
                      value={workloadConfig.spec.strategy?.maxSurge}
                      onChange={(e) => updateWorkloadConfig('spec.strategy.maxSurge', e.target.value)}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Card>
        );

      case WorkloadKind.Statefulset:
        return (
          <Card title="StatefulSet 配置" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="副本数" name="replicas">
                  <InputNumber
                    min={1}
                    max={100}
                    value={workloadConfig.spec.replicas}
                    onChange={(value) => updateWorkloadConfig('spec.replicas', value || 1)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="服务名称" name="serviceName">
                  <Input
                    placeholder="留空使用工作负载名称"
                    value={workloadConfig.spec.serviceName}
                    onChange={(e) => updateWorkloadConfig('spec.serviceName', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Pod 管理策略" name="podManagementPolicy">
                  <Select
                    value={workloadConfig.spec.podManagementPolicy || 'OrderedReady'}
                    onChange={(value) => updateWorkloadConfig('spec.podManagementPolicy', value)}
                  >
                    <Option value="OrderedReady">顺序就绪</Option>
                    <Option value="Parallel">并行</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case WorkloadKind.Job:
        return (
          <Card title="Job 配置" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="并发数" name="parallelism">
                  <InputNumber
                    min={1}
                    value={workloadConfig.spec.parallelism || 1}
                    onChange={(value) => updateWorkloadConfig('spec.parallelism', value)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="完成数" name="completions">
                  <InputNumber
                    min={1}
                    value={workloadConfig.spec.completions || 1}
                    onChange={(value) => updateWorkloadConfig('spec.completions', value)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="重试次数" name="backoffLimit">
                  <InputNumber
                    min={0}
                    value={workloadConfig.spec.backoffLimit || 6}
                    onChange={(value) => updateWorkloadConfig('spec.backoffLimit', value)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="重启策略" name="restartPolicy">
                  <Select
                    value={workloadConfig.spec.restartPolicy || 'Never'}
                    onChange={(value) => updateWorkloadConfig('spec.restartPolicy', value)}
                  >
                    <Option value="Never">Never</Option>
                    <Option value="OnFailure">OnFailure</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  label={
                    <Space>
                      超时时间 (秒)
                      <Tooltip title="任务运行的最大时间">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="activeDeadlineSeconds"
                >
                  <InputNumber
                    min={1}
                    placeholder="不限制"
                    value={workloadConfig.spec.activeDeadlineSeconds}
                    onChange={(value) => updateWorkloadConfig('spec.activeDeadlineSeconds', value)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label={
                    <Space>
                      清理时间 (秒)
                      <Tooltip title="任务完成后多长时间自动清理">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="ttlSecondsAfterFinished"
                >
                  <InputNumber
                    min={0}
                    placeholder="不自动清理"
                    value={workloadConfig.spec.ttlSecondsAfterFinished}
                    onChange={(value) => updateWorkloadConfig('spec.ttlSecondsAfterFinished', value)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case WorkloadKind.Cronjob:
        return (
          <Card title="CronJob 配置" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={
                    <Space>
                      调度规则 (Cron)
                      <Tooltip title="格式：分 时 日 月 周。例如：0 2 * * * 表示每天凌晨2点执行">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="schedule"
                  rules={[{ required: true, message: '请输入调度规则' }]}
                >
                  <Input
                    placeholder="0 0 * * *"
                    value={workloadConfig.spec.schedule}
                    onChange={(e) => updateWorkloadConfig('spec.schedule', e.target.value)}
                  />
                </Form.Item>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag onClick={() => updateWorkloadConfig('spec.schedule', '0 0 * * *')}>每天午夜</Tag>
                    <Tag onClick={() => updateWorkloadConfig('spec.schedule', '0 */6 * * *')}>每6小时</Tag>
                    <Tag onClick={() => updateWorkloadConfig('spec.schedule', '0 0 * * 0')}>每周日</Tag>
                    <Tag onClick={() => updateWorkloadConfig('spec.schedule', '0 0 1 * *')}>每月1号</Tag>
                  </Space>
                </div>
              </Col>
              <Col span={12}>
                <Form.Item label="并发策略" name="concurrencyPolicy">
                  <Select
                    value={workloadConfig.spec.concurrencyPolicy || 'Allow'}
                    onChange={(value) => updateWorkloadConfig('spec.concurrencyPolicy', value)}
                  >
                    <Option value="Allow">允许并发</Option>
                    <Option value="Forbid">禁止并发</Option>
                    <Option value="Replace">替换旧任务</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="成功历史记录" name="successfulJobsHistoryLimit">
                  <InputNumber
                    min={0}
                    value={workloadConfig.spec.successfulJobsHistoryLimit || 3}
                    onChange={(value) => updateWorkloadConfig('spec.successfulJobsHistoryLimit', value)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="失败历史记录" name="failedJobsHistoryLimit">
                  <InputNumber
                    min={0}
                    value={workloadConfig.spec.failedJobsHistoryLimit || 1}
                    onChange={(value) => updateWorkloadConfig('spec.failedJobsHistoryLimit', value)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="启动截止时间(秒)" name="startingDeadlineSeconds">
                  <InputNumber
                    min={1}
                    placeholder="不限制"
                    value={workloadConfig.spec.startingDeadlineSeconds}
                    onChange={(value) => updateWorkloadConfig('spec.startingDeadlineSeconds', value)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderContainerConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      {workloadConfig.spec.containers.map((container, containerIndex) => (
        <Card
          key={containerIndex}
          title={
            <Space>
              <Badge count={containerIndex + 1} size="small" style={{ backgroundColor: '#1890ff' }}>
                <div style={{ width: 16, height: 16 }} />
              </Badge>
              <Text strong>{container.name || `容器 ${containerIndex + 1}`}</Text>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            workloadConfig.spec.containers.length > 1 && (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeContainer(containerIndex)}
              >
                删除容器
              </Button>
            )
          }
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="容器名称" required>
                <Input
                  value={container.name}
                  onChange={(e) => updateContainer(containerIndex, 'name', e.target.value)}
                  placeholder="输入容器名称"
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="镜像" required>
                <Input
                  value={container.image}
                  onChange={(e) => updateContainer(containerIndex, 'image', e.target.value)}
                  placeholder="例如: nginx:latest"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="拉取策略">
                <Select
                  value={container.imagePullPolicy}
                  onChange={(value) => updateContainer(containerIndex, 'imagePullPolicy', value)}
                  size="small"
                >
                  <Option value="IfNotPresent">IfNotPresent</Option>
                  <Option value="Always">Always</Option>
                  <Option value="Never">Never</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Collapse ghost>
            <Panel 
              header={
                <Space>
                  <CloudOutlined />
                  <Text>端口配置</Text>
                  {container.ports.length > 0 && (
                    <Badge count={container.ports.length} size="small" />
                  )}
                </Space>
              } 
              key="ports"
            >
              <div style={{ marginBottom: 8 }}>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const newConfig = { ...workloadConfig };
                    newConfig.spec.containers[containerIndex].ports.push({
                      containerPort: 80,
                      protocol: 'TCP',
                    });
                    setWorkloadConfig(newConfig);
                  }}
                  size="small"
                >
                  添加端口
                </Button>
              </div>
              {container.ports.map((port, portIndex) => (
                <Row key={portIndex} gutter={8} style={{ marginBottom: 8, alignItems: 'center' }}>
                  <Col span={6}>
                    <InputNumber
                      placeholder="端口号"
                      value={port.containerPort}
                      onChange={(value) => {
                        const newConfig = { ...workloadConfig };
                        newConfig.spec.containers[containerIndex].ports[portIndex].containerPort = value || 80;
                        setWorkloadConfig(newConfig);
                      }}
                      style={{ width: '100%' }}
                      min={1}
                      max={65535}
                    />
                  </Col>
                  <Col span={6}>
                    <Select
                      value={port.protocol}
                      onChange={(value) => {
                        const newConfig = { ...workloadConfig };
                        newConfig.spec.containers[containerIndex].ports[portIndex].protocol = value;
                        setWorkloadConfig(newConfig);
                      }}
                      style={{ width: '100%' }}
                    >
                      <Option value="TCP">TCP</Option>
                      <Option value="UDP">UDP</Option>
                    </Select>
                  </Col>
                  <Col span={8}>
                    <Input
                      placeholder="端口名称(可选)"
                      value={port.name}
                      onChange={(e) => {
                        const newConfig = { ...workloadConfig };
                        newConfig.spec.containers[containerIndex].ports[portIndex].name = e.target.value;
                        setWorkloadConfig(newConfig);
                      }}
                    />
                  </Col>
                  <Col span={4}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const newConfig = { ...workloadConfig };
                        newConfig.spec.containers[containerIndex].ports.splice(portIndex, 1);
                        setWorkloadConfig(newConfig);
                      }}
                    />
                  </Col>
                </Row>
              ))}
            </Panel>

            <Panel 
              header={
                <Space>
                  <SettingOutlined />
                  <Text>环境变量</Text>
                  {container.env.length > 0 && (
                    <Badge count={container.env.length} size="small" />
                  )}
                </Space>
              } 
              key="env"
            >
              <div style={{ marginBottom: 8 }}>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const newConfig = { ...workloadConfig };
                    newConfig.spec.containers[containerIndex].env.push({ name: '', value: '' });
                    setWorkloadConfig(newConfig);
                  }}
                  size="small"
                >
                  添加环境变量
                </Button>
              </div>
              {container.env.map((env, envIndex) => (
                <Row key={envIndex} gutter={8} style={{ marginBottom: 8, alignItems: 'center' }}>
                  <Col span={10}>
                    <Input
                      placeholder="变量名"
                      value={env.name}
                      onChange={(e) => {
                        const newConfig = { ...workloadConfig };
                        newConfig.spec.containers[containerIndex].env[envIndex].name = e.target.value;
                        setWorkloadConfig(newConfig);
                      }}
                    />
                  </Col>
                  <Col span={10}>
                    <Input
                      placeholder="变量值"
                      value={env.value}
                      onChange={(e) => {
                        const newConfig = { ...workloadConfig };
                        newConfig.spec.containers[containerIndex].env[envIndex].value = e.target.value;
                        setWorkloadConfig(newConfig);
                      }}
                    />
                  </Col>
                  <Col span={4}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const newConfig = { ...workloadConfig };
                        newConfig.spec.containers[containerIndex].env.splice(envIndex, 1);
                        setWorkloadConfig(newConfig);
                      }}
                    />
                  </Col>
                </Row>
              ))}
            </Panel>

            <Panel 
              header={
                <Space>
                  <DatabaseOutlined />
                  <Text>资源限制</Text>
                </Space>
              } 
              key="resources"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>资源请求</Text>
                  <Form.Item label="CPU" style={{ marginTop: 8 }}>
                    <Input
                      value={container.resources.requests.cpu}
                      onChange={(e) => updateContainer(containerIndex, 'resources.requests.cpu', e.target.value)}
                      placeholder="100m"
                      addonAfter="millicores"
                    />
                  </Form.Item>
                  <Form.Item label="内存">
                    <Input
                      value={container.resources.requests.memory}
                      onChange={(e) => updateContainer(containerIndex, 'resources.requests.memory', e.target.value)}
                      placeholder="128Mi"
                      addonAfter="Mi/Gi"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Text strong>资源限制</Text>
                  <Form.Item label="CPU" style={{ marginTop: 8 }}>
                    <Input
                      value={container.resources.limits.cpu}
                      onChange={(e) => updateContainer(containerIndex, 'resources.limits.cpu', e.target.value)}
                      placeholder="500m"
                      addonAfter="millicores"
                    />
                  </Form.Item>
                  <Form.Item label="内存">
                    <Input
                      value={container.resources.limits.memory}
                      onChange={(e) => updateContainer(containerIndex, 'resources.limits.memory', e.target.value)}
                      placeholder="512Mi"
                      addonAfter="Mi/Gi"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Panel>

            <Panel 
              header={
                <Space>
                  <BugOutlined />
                  <Text>健康检查</Text>
                </Space>
              } 
              key="healthcheck"
            >
              {renderHealthChecks(containerIndex)}
            </Panel>
          </Collapse>
        </Card>
      ))}
      
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={addContainer}
        style={{ width: '100%', marginTop: 16 }}
        size="large"
      >
        添加容器
      </Button>
    </div>
  );

  const renderHealthChecks = (containerIndex: number) => {
    const container = workloadConfig.spec.containers[containerIndex];
    
    return (
      <div>
        <Divider orientation="left" orientationMargin="0">
          <Text strong>存活探针 (Liveness Probe)</Text>
        </Divider>
        <Row gutter={16}>
          <Col span={4}>
            <Form.Item label="启用">
              <Switch
                checked={container.livenessProbe?.enabled}
                onChange={(checked) => {
                  updateContainer(containerIndex, 'livenessProbe.enabled', checked);
                  if (checked && !container.livenessProbe) {
                    updateContainer(containerIndex, 'livenessProbe', {
                      enabled: true,
                      type: 'http',
                      httpPath: '/',
                      port: 80,
                      initialDelaySeconds: 30,
                      periodSeconds: 10,
                      timeoutSeconds: 1,
                      successThreshold: 1,
                      failureThreshold: 3,
                    });
                  }
                }}
              />
            </Form.Item>
          </Col>
          {container.livenessProbe?.enabled && (
            <>
              <Col span={4}>
                <Form.Item label="类型">
                  <Select
                    value={container.livenessProbe.type}
                    onChange={(value) => updateContainer(containerIndex, 'livenessProbe.type', value)}
                  >
                    <Option value="http">HTTP</Option>
                    <Option value="tcp">TCP</Option>
                    <Option value="exec">命令</Option>
                  </Select>
                </Form.Item>
              </Col>
              {container.livenessProbe.type === 'http' && (
                <>
                  <Col span={6}>
                    <Form.Item label="路径">
                      <Input
                        value={container.livenessProbe.httpPath}
                        onChange={(e) => updateContainer(containerIndex, 'livenessProbe.httpPath', e.target.value)}
                        placeholder="/"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item label="端口">
                      <InputNumber
                        value={container.livenessProbe.port}
                        onChange={(value) => updateContainer(containerIndex, 'livenessProbe.port', value)}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </>
              )}
              {container.livenessProbe.type === 'tcp' && (
                <Col span={6}>
                  <Form.Item label="端口">
                    <InputNumber
                      value={container.livenessProbe.port}
                      onChange={(value) => updateContainer(containerIndex, 'livenessProbe.port', value)}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              )}
              {container.livenessProbe.type === 'exec' && (
                <Col span={10}>
                  <Form.Item label="命令">
                    <Input
                      value={container.livenessProbe.command}
                      onChange={(e) => updateContainer(containerIndex, 'livenessProbe.command', e.target.value)}
                      placeholder="echo hello"
                    />
                  </Form.Item>
                </Col>
              )}
            </>
          )}
        </Row>
        
        <Divider orientation="left" orientationMargin="0">
          <Text strong>就绪探针 (Readiness Probe)</Text>
        </Divider>
        <Row gutter={16}>
          <Col span={4}>
            <Form.Item label="启用">
              <Switch
                checked={container.readinessProbe?.enabled}
                onChange={(checked) => {
                  updateContainer(containerIndex, 'readinessProbe.enabled', checked);
                  if (checked && !container.readinessProbe) {
                    updateContainer(containerIndex, 'readinessProbe', {
                      enabled: true,
                      type: 'http',
                      httpPath: '/',
                      port: 80,
                      initialDelaySeconds: 5,
                      periodSeconds: 10,
                      timeoutSeconds: 1,
                      successThreshold: 1,
                      failureThreshold: 3,
                    });
                  }
                }}
              />
            </Form.Item>
          </Col>
          {container.readinessProbe?.enabled && (
            <>
              <Col span={4}>
                <Form.Item label="类型">
                  <Select
                    value={container.readinessProbe.type}
                    onChange={(value) => updateContainer(containerIndex, 'readinessProbe.type', value)}
                  >
                    <Option value="http">HTTP</Option>
                    <Option value="tcp">TCP</Option>
                    <Option value="exec">命令</Option>
                  </Select>
                </Form.Item>
              </Col>
              {container.readinessProbe.type === 'http' && (
                <>
                  <Col span={6}>
                    <Form.Item label="路径">
                      <Input
                        value={container.readinessProbe.httpPath}
                        onChange={(e) => updateContainer(containerIndex, 'readinessProbe.httpPath', e.target.value)}
                        placeholder="/"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item label="端口">
                      <InputNumber
                        value={container.readinessProbe.port}
                        onChange={(value) => updateContainer(containerIndex, 'readinessProbe.port', value)}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </>
              )}
            </>
          )}
        </Row>
      </div>
    );
  };

  const renderAdvancedConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      <Card title="标签和注解" size="small" style={{ marginBottom: 16 }}>
        <Alert
          message="标签和注解用于给资源添加元数据信息"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Collapse ghost>
          <Panel header="标签 (Labels)" key="labels">
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                const key = `label-${Date.now()}`;
                updateWorkloadConfig(`metadata.labels.${key}`, '');
              }}
              style={{ marginBottom: 8 }}
              size="small"
            >
              添加标签
            </Button>
            {Object.entries(workloadConfig.metadata.labels).map(([key, value]) => (
              key !== 'app' && (
                <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Input
                      placeholder="标签键"
                      value={key}
                      onChange={(e) => {
                        const newConfig = { ...workloadConfig };
                        delete newConfig.metadata.labels[key];
                        newConfig.metadata.labels[e.target.value] = value;
                        setWorkloadConfig(newConfig);
                      }}
                    />
                  </Col>
                  <Col span={10}>
                    <Input
                      placeholder="标签值"
                      value={value}
                      onChange={(e) => updateWorkloadConfig(`metadata.labels.${key}`, e.target.value)}
                    />
                  </Col>
                  <Col span={4}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const newConfig = { ...workloadConfig };
                        delete newConfig.metadata.labels[key];
                        setWorkloadConfig(newConfig);
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
                updateWorkloadConfig(`metadata.annotations.${key}`, '');
              }}
              style={{ marginBottom: 8 }}
              size="small"
            >
              添加注解
            </Button>
            {Object.entries(workloadConfig.metadata.annotations).map(([key, value]) => (
              <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                <Col span={10}>
                  <Input
                    placeholder="注解键"
                    value={key}
                    onChange={(e) => {
                      const newConfig = { ...workloadConfig };
                      delete newConfig.metadata.annotations[key];
                      newConfig.metadata.annotations[e.target.value] = value;
                      setWorkloadConfig(newConfig);
                    }}
                  />
                </Col>
                <Col span={10}>
                  <Input
                    placeholder="注解值"
                    value={value}
                    onChange={(e) => updateWorkloadConfig(`metadata.annotations.${key}`, e.target.value)}
                  />
                </Col>
                <Col span={4}>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const newConfig = { ...workloadConfig };
                      delete newConfig.metadata.annotations[key];
                      setWorkloadConfig(newConfig);
                    }}
                  />
                </Col>
              </Row>
            ))}
          </Panel>
        </Collapse>
      </Card>

      <Card title="调度配置" size="small">
        <Form.Item 
          label={
            <Space>
              节点选择器
              <Tooltip title="指定Pod应该运行在哪些节点上">
                <InfoCircleOutlined />
              </Tooltip>
            </Space>
          }
        >
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              const key = `kubernetes.io/arch`;
              updateWorkloadConfig(`spec.nodeSelector.${key}`, 'amd64');
            }}
            style={{ marginBottom: 8 }}
            size="small"
          >
            添加节点选择器
          </Button>
          {Object.entries(workloadConfig.spec.nodeSelector || {}).map(([key, value]) => (
            <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
              <Col span={10}>
                <Input
                  placeholder="选择器键"
                  value={key}
                  onChange={(e) => {
                    const newConfig = { ...workloadConfig };
                    if (!newConfig.spec.nodeSelector) newConfig.spec.nodeSelector = {};
                    delete newConfig.spec.nodeSelector[key];
                    newConfig.spec.nodeSelector[e.target.value] = value;
                    setWorkloadConfig(newConfig);
                  }}
                />
              </Col>
              <Col span={10}>
                <Input
                  placeholder="选择器值"
                  value={value}
                  onChange={(e) => updateWorkloadConfig(`spec.nodeSelector.${key}`, e.target.value)}
                />
              </Col>
              <Col span={4}>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const newConfig = { ...workloadConfig };
                    if (newConfig.spec.nodeSelector) {
                      delete newConfig.spec.nodeSelector[key];
                    }
                    setWorkloadConfig(newConfig);
                  }}
                />
              </Col>
            </Row>
          ))}
        </Form.Item>
      </Card>
    </div>
  );

  const renderPreview = () => {
    const yamlObject = generateYAML(workloadConfig);
    const yamlContent = stringify(yamlObject);
    
    // 计算副本数显示
    const getReplicasInfo = () => {
      if (kind === WorkloadKind.Daemonset) {
        return '每个节点运行一个副本';
      } else if (kind === WorkloadKind.Job || kind === WorkloadKind.Cronjob) {
        if (kind === WorkloadKind.Job) {
          return `并发数: ${workloadConfig.spec.parallelism || 1}, 完成数: ${workloadConfig.spec.completions || 1}`;
        }
        return '定时任务';
      } else {
        return `副本数: ${workloadConfig.spec.replicas}`;
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
          message={`即将创建 ${getWorkloadKindLabel(kind)}: ${workloadConfig.metadata.name}`}
          description={`命名空间: ${workloadConfig.metadata.namespace} | 容器数: ${workloadConfig.spec.containers.length} | ${getReplicasInfo()}`}
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
      description: '设置工作负载基本信息',
      content: renderBasicConfig(),
      icon: <SettingOutlined />,
    },
    {
      title: '容器配置',
      description: '配置容器镜像和运行参数',
      content: renderContainerConfig(),
      icon: <CloudOutlined />,
    },
    {
      title: '高级配置',
      description: '标签、注解和调度配置',
      content: renderAdvancedConfig(),
      icon: <DatabaseOutlined />,
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
          {getWorkloadIcon(kind)}
          <Text strong style={{ fontSize: '16px' }}>
            创建 {getWorkloadKindLabel(kind)}
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

export default WorkloadWizardModal; 