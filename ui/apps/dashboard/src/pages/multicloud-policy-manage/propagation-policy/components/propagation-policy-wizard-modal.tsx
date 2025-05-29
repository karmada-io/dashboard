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
  Button,
  Space,
  Row,
  Col,
  message,
  Typography,
  Alert,
  Collapse,
  Badge,
  Switch,
  InputNumber,
  Radio,
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  ClusterOutlined,
  DeploymentUnitOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { CreatePropagationPolicy } from '@/services/propagationpolicy';
import { GetClusters } from '@/services/cluster';
import { GetWorkloads } from '@/services/workload';
import { GetServices } from '@/services/service';
import { GetConfigMaps, GetSecrets } from '@/services/config';
import { IResponse, PolicyScope, WorkloadKind } from '@/services/base';
import { stringify } from 'yaml';
import useNamespace from '@/hooks/use-namespace';
import { useQuery } from '@tanstack/react-query';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;
const { Panel } = Collapse;

export interface PropagationPolicyWizardModalProps {
  open: boolean;
  scope: PolicyScope;
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

interface ResourceSelector {
  apiVersion: string;
  kind: string;
  name?: string;
  namespace?: string;
  labelSelector?: Record<string, string>;
}

interface PlacementRule {
  clusters?: string[];
  clusterTolerations?: Array<{
    key?: string;
    operator?: 'Equal' | 'Exists';
    value?: string;
    effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
    tolerationSeconds?: number;
  }>;
  spreadConstraints?: Array<{
    spreadByField: string;
    spreadByLabel?: string;
    maxSkew?: number;
    minGroups?: number;
  }>;
  replicaScheduling?: {
    replicaDivisionPreference?: 'Aggregated' | 'Weighted';
    replicaSchedulingType?: 'Duplicated' | 'Divided';
    weightPreference?: {
      staticWeightList?: Array<{
        targetCluster: {
          clusterNames?: string[];
        };
        weight: number;
      }>;
    };
  };
}

interface PropagationPolicyConfig {
  metadata: {
    name: string;
    namespace?: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
  };
  spec: {
    resourceSelectors: ResourceSelector[];
    placement: PlacementRule;
    preemption?: 'Always' | 'Never';
    conflictResolution?: 'Abort' | 'Overwrite';
    priority?: number;
    schedulerName?: string;
    suspendDispatching?: boolean;
    failover?: {
      application?: {
        decisionConditions?: {
          tolerationSeconds?: number;
        };
        gracePeriodSeconds?: number;
      };
    };
  };
}

const PropagationPolicyWizardModal: React.FC<PropagationPolicyWizardModalProps> = ({
  open,
  scope,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // 添加命名空间数据获取
  const { nsOptions, isNsDataLoading } = useNamespace({});
  
  // 添加集群数据获取
  const { data: clusterData, isLoading: isClusterDataLoading } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
    enabled: open, // 只在模态框打开时获取数据
  });

  // 转换集群数据为选项格式
  const clusterOptions = React.useMemo(() => {
    if (!clusterData?.clusters) return [];
    return clusterData.clusters.map((cluster: any) => ({
      label: cluster.objectMeta.name,
      value: cluster.objectMeta.name,
    }));
  }, [clusterData]);
  
  const [policyConfig, setPolicyConfig] = useState<PropagationPolicyConfig>({
    metadata: {
      name: '',
      namespace: scope === PolicyScope.Namespace ? 'default' : undefined,
      labels: {},
      annotations: {},
    },
    spec: {
      resourceSelectors: [
        {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
        },
      ],
      placement: {
        replicaScheduling: {
          replicaDivisionPreference: 'Aggregated' as const,
          replicaSchedulingType: 'Duplicated' as const,
        },
      },
    },
  });

  const getScopeLabel = (scope: PolicyScope) => {
    return scope === PolicyScope.Namespace ? '命名空间传播策略' : '集群传播策略';
  };

  const getScopeDescription = (scope: PolicyScope) => {
    return scope === PolicyScope.Namespace 
      ? '管理特定命名空间内资源的跨集群分发'
      : '管理集群级别资源的跨集群分发';
  };

  const getScopeIcon = (scope: PolicyScope) => {
    return scope === PolicyScope.Namespace ? <BranchesOutlined /> : <ClusterOutlined />;
  };

  // 重置配置到默认值
  useEffect(() => {
    if (open) {
      setPolicyConfig(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          name: '',
          namespace: scope === PolicyScope.Namespace ? 'default' : undefined,
          labels: {},
          annotations: {},
        },
        spec: {
          resourceSelectors: [
            {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
            },
          ],
          placement: {
            replicaScheduling: {
              replicaDivisionPreference: 'Aggregated' as const,
              replicaSchedulingType: 'Duplicated' as const,
            },
          },
        },
      }));
    }
  }, [open, scope]);

  const generateYAML = (config: PropagationPolicyConfig) => {
    const kindLabel = scope === PolicyScope.Namespace ? 'PropagationPolicy' : 'ClusterPropagationPolicy';
    const apiVersion = 'policy.karmada.io/v1alpha1';

    const baseMetadata = {
      name: config.metadata.name,
      ...(scope === PolicyScope.Namespace && config.metadata.namespace && {
        namespace: config.metadata.namespace,
      }),
      labels: {
        app: config.metadata.name,
        ...config.metadata.labels,
      },
      ...(Object.keys(config.metadata.annotations).length > 0 && {
        annotations: config.metadata.annotations,
      }),
    };

    const spec: any = {
      resourceSelectors: config.spec.resourceSelectors.map(selector => ({
        apiVersion: selector.apiVersion,
        kind: selector.kind,
        ...(selector.name && { name: selector.name }),
        ...(selector.namespace && { namespace: selector.namespace }),
        ...(selector.labelSelector && Object.keys(selector.labelSelector).length > 0 && {
          labelSelector: {
            matchLabels: selector.labelSelector,
          },
        }),
      })),
      placement: {
        ...(config.spec.placement.clusters && config.spec.placement.clusters.length > 0 && {
          clusterAffinity: {
            clusterNames: config.spec.placement.clusters,
          },
        }),
        ...(config.spec.placement.clusterTolerations && config.spec.placement.clusterTolerations.length > 0 && {
          clusterTolerations: config.spec.placement.clusterTolerations,
        }),
        ...(config.spec.placement.spreadConstraints && config.spec.placement.spreadConstraints.length > 0 && {
          spreadConstraints: config.spec.placement.spreadConstraints,
        }),
        ...(config.spec.placement.replicaScheduling && {
          replicaScheduling: config.spec.placement.replicaScheduling,
        }),
      },
      ...(config.spec.preemption && { preemption: config.spec.preemption }),
      ...(config.spec.conflictResolution && { conflictResolution: config.spec.conflictResolution }),
      ...(config.spec.priority !== undefined && { priority: config.spec.priority }),
      ...(config.spec.schedulerName && { schedulerName: config.spec.schedulerName }),
      ...(config.spec.suspendDispatching !== undefined && { suspendDispatching: config.spec.suspendDispatching }),
      ...(config.spec.failover && { failover: config.spec.failover }),
    };

    return {
      apiVersion,
      kind: kindLabel,
      metadata: baseMetadata,
      spec,
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
      const yamlObject = generateYAML(policyConfig);
      const yamlContent = stringify(yamlObject);
      
      const ret = await CreatePropagationPolicy({
        isClusterScope: scope === PolicyScope.Cluster,
        namespace: policyConfig.metadata.namespace || '',
        name: policyConfig.metadata.name,
        propagationData: yamlContent,
      });

      await onOk(ret);
      handleReset();
    } catch (error) {
      console.error('创建传播策略失败:', error);
      message.error('创建传播策略失败');
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
        namespace: scope === PolicyScope.Namespace ? 'default' : undefined,
        labels: {},
        annotations: {},
      },
      spec: {
        resourceSelectors: [
          {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
          },
        ],
        placement: {
          replicaScheduling: {
            replicaDivisionPreference: 'Aggregated' as const,
            replicaSchedulingType: 'Duplicated' as const,
          },
        },
      },
    };
    setPolicyConfig(defaultConfig);
    // 重置表单字段值
    form.setFieldsValue({
      name: '',
      namespace: scope === PolicyScope.Namespace ? 'default' : undefined,
      preemption: 'Never',
      conflictResolution: 'Abort',
      replicaDivisionPreference: 'Aggregated',
      replicaSchedulingType: 'Duplicated',
    });
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  const updatePolicyConfig = (path: string, value: any) => {
    setPolicyConfig(prev => {
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

  const addResourceSelector = () => {
    const newConfig = { ...policyConfig };
    newConfig.spec.resourceSelectors.push({
      apiVersion: 'v1',
      kind: 'Service',
    });
    setPolicyConfig(newConfig);
  };

  const removeResourceSelector = (index: number) => {
    const newConfig = { ...policyConfig };
    newConfig.spec.resourceSelectors.splice(index, 1);
    setPolicyConfig(newConfig);
  };

  const updateResourceSelector = (index: number, field: string, value: any) => {
    const newConfig = { ...policyConfig };
    const keys = field.split('.');
    let current: any = newConfig.spec.resourceSelectors[index];
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setPolicyConfig(newConfig);
  };

  // 资源名称选择组件
  const ResourceNameSelect: React.FC<{
    selectorIndex: number;
    selector: ResourceSelector;
    updateResourceSelector: (index: number, field: string, value: any) => void;
  }> = ({ selectorIndex, selector, updateResourceSelector }) => {
    // 根据资源类型获取对应的资源列表
    const { data: resourceData, isLoading: isResourceLoading } = useQuery({
      queryKey: ['GetResources', selector.kind, selector.namespace],
      queryFn: async () => {
        if (!selector.namespace) return null;
        
        switch (selector.kind) {
          case 'Deployment':
            return await GetWorkloads({
              namespace: selector.namespace,
              kind: WorkloadKind.Deployment
            });
          case 'Service':
            return await GetServices({
              namespace: selector.namespace
            });
          case 'ConfigMap':
            return await GetConfigMaps({
              namespace: selector.namespace
            });
          case 'Secret':
            return await GetSecrets({
              namespace: selector.namespace
            });
          case 'Job':
            return await GetWorkloads({
              namespace: selector.namespace,
              kind: WorkloadKind.Job
            });
          case 'CronJob':
            return await GetWorkloads({
              namespace: selector.namespace,
              kind: WorkloadKind.Cronjob
            });
          default:
            return null;
        }
      },
      enabled: !!selector.namespace && !!selector.kind,
    });

    // 转换资源数据为选项格式
    const resourceOptions = React.useMemo(() => {
      if (!resourceData?.data) return [];
      
      let items: any[] = [];
      const data = resourceData.data as any;
      
      // 根据不同的API响应格式获取数据
      if (selector.kind === 'Deployment' || selector.kind === 'Job' || selector.kind === 'CronJob') {
        items = data.deployments || data.jobs || data.items || [];
      } else if (selector.kind === 'Service') {
        items = data.services || [];
      } else if (selector.kind === 'ConfigMap') {
        items = data.items || [];
      } else if (selector.kind === 'Secret') {
        items = data.secrets || [];
      }
      
      return items.map((item: any) => ({
        label: item.objectMeta?.name || item.name,
        value: item.objectMeta?.name || item.name,
      }));
    }, [resourceData, selector.kind]);

    return (
      <Select
        size="small"
        value={selector.name}
        onChange={(value) => updateResourceSelector(selectorIndex, 'name', value)}
        placeholder={selector.namespace ? "选择资源" : "请先选择命名空间"}
        style={{ width: '100%' }}
        showSearch
        filterOption={(input, option) =>
          (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
        }
        loading={isResourceLoading}
        disabled={!selector.namespace}
        options={resourceOptions}
        notFoundContent={isResourceLoading ? '加载中...' : '暂无资源'}
      />
    );
  };

  const renderBasicConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      <Alert
        message={
          <Space>
            {getScopeIcon(scope)}
            <Text strong>{getScopeLabel(scope)}</Text>
          </Space>
        }
        description={getScopeDescription(scope)}
        type="info"
        showIcon={false}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <Form form={form} layout="vertical" size="large">
        <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
          <Text strong style={{ marginBottom: '12px', display: 'block' }}>基本信息</Text>
          <Row gutter={16}>
            <Col span={scope === PolicyScope.Namespace ? 12 : 24}>
              <Form.Item
                label="策略名称"
                name="name"
                initialValue={policyConfig.metadata.name}
                rules={[
                  { required: true, message: '请输入策略名称' },
                  { pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, message: '名称只能包含小写字母、数字和连字符' }
                ]}
                style={{ marginBottom: 8 }}
              >
                <Input
                  size="small"
                  placeholder="输入策略名称"
                  onChange={(e) => {
                    updatePolicyConfig('metadata.name', e.target.value);
                    form.setFieldValue('name', e.target.value);
                  }}
                />
              </Form.Item>
            </Col>
            {scope === PolicyScope.Namespace && (
              <Col span={12}>
                <Form.Item
                  label="命名空间"
                  name="namespace"
                  initialValue={policyConfig.metadata.namespace}
                  rules={[{ required: true, message: '请选择命名空间' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Select
                    size="small"
                    placeholder="选择命名空间"
                    onChange={(value) => {
                      updatePolicyConfig('metadata.namespace', value);
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
            )}
          </Row>
        </div>

        <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
          <Text strong style={{ marginBottom: '12px', display: 'block' }}>策略配置</Text>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item label="抢占策略" name="preemption" style={{ marginBottom: 8 }}>
                <Select
                  size="small"
                  value={policyConfig.spec.preemption || 'Never'}
                  onChange={(value) => updatePolicyConfig('spec.preemption', value)}
                >
                  <Option value="Always">Always - 总是抢占</Option>
                  <Option value="Never">Never - 从不抢占</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="冲突解决" name="conflictResolution" style={{ marginBottom: 8 }}>
                <Select
                  size="small"
                  value={policyConfig.spec.conflictResolution || 'Abort'}
                  onChange={(value) => updatePolicyConfig('spec.conflictResolution', value)}
                >
                  <Option value="Abort">Abort - 中止部署</Option>
                  <Option value="Overwrite">Overwrite - 覆盖冲突</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 8]}>
            <Col span={8}>
              <Form.Item label="优先级" style={{ marginBottom: 8 }}>
                <InputNumber
                  size="small"
                  value={policyConfig.spec.priority}
                  onChange={(value) => updatePolicyConfig('spec.priority', value)}
                  style={{ width: '100%' }}
                  min={0}
                  max={1000}
                  placeholder="0-1000"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="调度器名称" style={{ marginBottom: 8 }}>
                <Input
                  size="small"
                  value={policyConfig.spec.schedulerName}
                  onChange={(e) => updatePolicyConfig('spec.schedulerName', e.target.value)}
                  placeholder="default-scheduler"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="暂停分发" style={{ marginBottom: 8 }}>
                <Switch
                  checked={policyConfig.spec.suspendDispatching}
                  onChange={(checked) => updatePolicyConfig('spec.suspendDispatching', checked)}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Form>
    </div>
  );

  const renderResourceConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Space>
            <DeploymentUnitOutlined />
            <Text strong>资源选择器</Text>
            <Badge count={policyConfig.spec.resourceSelectors.length} size="small" />
          </Space>
        </div>
        
        {policyConfig.spec.resourceSelectors.map((selector, selectorIndex) => (
          <div
            key={selectorIndex}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              backgroundColor: '#f5f5f5',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <Space>
                <Badge count={selectorIndex + 1} size="small" style={{ backgroundColor: '#1890ff' }}>
                  <div style={{ width: 16, height: 16 }} />
                </Badge>
                <Text strong>{selector.kind || `选择器 ${selectorIndex + 1}`}</Text>
              </Space>
              {policyConfig.spec.resourceSelectors.length > 1 && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeResourceSelector(selectorIndex)}
                >
                  删除
                </Button>
              )}
            </div>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item label="API版本" required style={{ marginBottom: 8 }}>
                  <Select
                    size="small"
                    value={selector.apiVersion}
                    onChange={(value) => updateResourceSelector(selectorIndex, 'apiVersion', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="v1">v1</Option>
                    <Option value="apps/v1">apps/v1</Option>
                    <Option value="networking.k8s.io/v1">networking.k8s.io/v1</Option>
                    <Option value="batch/v1">batch/v1</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="资源类型" required style={{ marginBottom: 8 }}>
                  <Select
                    size="small"
                    value={selector.kind}
                    onChange={(value) => updateResourceSelector(selectorIndex, 'kind', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="Deployment">Deployment</Option>
                    <Option value="Service">Service</Option>
                    <Option value="ConfigMap">ConfigMap</Option>
                    <Option value="Secret">Secret</Option>
                    <Option value="Ingress">Ingress</Option>
                    <Option value="Job">Job</Option>
                    <Option value="CronJob">CronJob</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item label="资源名称" required style={{ marginBottom: 8 }}>
                  <ResourceNameSelect
                    selectorIndex={selectorIndex}
                    selector={selector}
                    updateResourceSelector={updateResourceSelector}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="命名空间" required style={{ marginBottom: 8 }}>
                  <Select
                    size="small"
                    value={selector.namespace}
                    onChange={(value) => updateResourceSelector(selectorIndex, 'namespace', value)}
                    placeholder="选择命名空间"
                    style={{ width: '100%' }}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    loading={isNsDataLoading}
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

            <Collapse ghost size="small">
              <Panel header="标签选择器" key="labelSelector">
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    if (!selector.labelSelector) {
                      updateResourceSelector(selectorIndex, 'labelSelector', {});
                    }
                    const key = `label-${Date.now()}`;
                    updateResourceSelector(selectorIndex, `labelSelector.${key}`, '');
                  }}
                  style={{ marginBottom: 8 }}
                  size="small"
                >
                  添加标签
                </Button>
                {selector.labelSelector && Object.entries(selector.labelSelector).map(([key, value]) => (
                  <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                    <Col span={10}>
                      <Input
                        size="small"
                        placeholder="标签键"
                        value={key}
                        onChange={(e) => {
                          const newSelector = { ...selector };
                          delete newSelector.labelSelector![key];
                          newSelector.labelSelector![e.target.value] = value;
                          updateResourceSelector(selectorIndex, 'labelSelector', newSelector.labelSelector);
                        }}
                      />
                    </Col>
                    <Col span={10}>
                      <Input
                        size="small"
                        placeholder="标签值"
                        value={value}
                        onChange={(e) => updateResourceSelector(selectorIndex, `labelSelector.${key}`, e.target.value)}
                      />
                    </Col>
                    <Col span={4}>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          const newSelector = { ...selector };
                          delete newSelector.labelSelector![key];
                          updateResourceSelector(selectorIndex, 'labelSelector', newSelector.labelSelector);
                        }}
                      />
                    </Col>
                  </Row>
                ))}
              </Panel>
            </Collapse>
          </div>
        ))}
        
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={addResourceSelector}
          style={{ width: '100%', marginTop: 8 }}
          size="middle"
        >
          添加资源选择器
        </Button>
      </div>
    </div>
  );

  const renderPlacementConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      {/* 集群调度配置 */}
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Space>
            <ClusterOutlined />
            <Text strong>目标集群</Text>
            <Badge count={policyConfig.spec.placement.clusters?.length || 0} size="small" />
          </Space>
        </div>
        
        {/* 批量选择集群 */}
        <div style={{ marginBottom: 16 }}>
          <Text style={{ marginBottom: 8, display: 'block' }}>选择目标集群：</Text>
          <Select
            mode="multiple"
            size="small"
            placeholder="选择一个或多个集群"
            style={{ width: '100%' }}
            value={policyConfig.spec.placement.clusters || []}
            onChange={(value) => {
              updatePolicyConfig('spec.placement.clusters', value);
            }}
            loading={isClusterDataLoading}
            showSearch
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={clusterOptions}
            notFoundContent={isClusterDataLoading ? '加载中...' : '暂无集群'}
          />
        </div>
        
        {/* 显示已选择的集群 */}
        {policyConfig.spec.placement.clusters && policyConfig.spec.placement.clusters.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已选择 {policyConfig.spec.placement.clusters.length} 个集群
            </Text>
          </div>
        )}
      </div>

      {/* 副本调度配置 */}
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
        <Text strong style={{ marginBottom: '12px', display: 'block' }}>副本调度</Text>
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item label="分发偏好" style={{ marginBottom: 8 }}>
              <Radio.Group
                size="small"
                value={policyConfig.spec.placement.replicaScheduling?.replicaDivisionPreference || 'Aggregated'}
                onChange={(e) => updatePolicyConfig('spec.placement.replicaScheduling.replicaDivisionPreference', e.target.value)}
              >
                <Radio value="Aggregated">聚合</Radio>
                <Radio value="Weighted">加权</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="调度类型" style={{ marginBottom: 8 }}>
              <Radio.Group
                size="small"
                value={policyConfig.spec.placement.replicaScheduling?.replicaSchedulingType || 'Duplicated'}
                onChange={(e) => updatePolicyConfig('spec.placement.replicaScheduling.replicaSchedulingType', e.target.value)}
              >
                <Radio value="Duplicated">复制</Radio>
                <Radio value="Divided">分割</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* 故障转移配置 */}
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
        <Text strong style={{ marginBottom: '12px', display: 'block' }}>故障转移</Text>
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item label="容忍时间(秒)" style={{ marginBottom: 8 }}>
              <InputNumber
                size="small"
                value={policyConfig.spec.failover?.application?.decisionConditions?.tolerationSeconds}
                onChange={(value) => updatePolicyConfig('spec.failover.application.decisionConditions.tolerationSeconds', value)}
                style={{ width: '100%' }}
                min={0}
                placeholder="30"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="优雅期限(秒)" style={{ marginBottom: 8 }}>
              <InputNumber
                size="small"
                value={policyConfig.spec.failover?.application?.gracePeriodSeconds}
                onChange={(value) => updatePolicyConfig('spec.failover.application.gracePeriodSeconds', value)}
                style={{ width: '100%' }}
                min={0}
                placeholder="600"
              />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </div>
  );

  const renderPreview = () => {
    const yamlObject = generateYAML(policyConfig);
    const yamlContent = stringify(yamlObject);
    
    // 计算资源信息显示
    const getResourcesInfo = () => {
      const resourceCount = policyConfig.spec.resourceSelectors.length;
      const clusterCount = policyConfig.spec.placement.clusters?.length || 0;
      return `资源选择器: ${resourceCount} | 目标集群: ${clusterCount}`;
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
          message={`即将创建 ${getScopeLabel(scope)}: ${policyConfig.metadata.name}`}
          description={`${scope === PolicyScope.Namespace ? `命名空间: ${policyConfig.metadata.namespace} | ` : ''}${getResourcesInfo()}`}
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
      description: '设置策略基本信息',
      content: renderBasicConfig(),
      icon: <SettingOutlined />,
    },
    {
      title: '资源选择',
      description: '配置资源选择器',
      content: renderResourceConfig(),
      icon: <DeploymentUnitOutlined />,
    },
    {
      title: '调度配置',
      description: '集群调度和故障转移',
      content: renderPlacementConfig(),
      icon: <ClusterOutlined />,
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
          {getScopeIcon(scope)}
          <Text strong style={{ fontSize: '16px' }}>
            创建 {getScopeLabel(scope)}
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

export default PropagationPolicyWizardModal; 