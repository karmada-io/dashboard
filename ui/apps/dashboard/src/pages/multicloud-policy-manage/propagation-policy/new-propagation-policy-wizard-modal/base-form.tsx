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

import i18nInstance from '@/utils/i18n';
import { FC, ReactNode, useState, useEffect } from 'react';
import { Button, Form, Input, Select, Space, Steps, message, Radio, Typography } from 'antd';
import { parse } from 'yaml';
import _ from 'lodash';
import { CreatePropagationPolicy } from '@/services/propagationpolicy';
import { IResponse } from '@/services/base';
import { schedulingPolicyTemplates } from '../schedulingPolicyTemplates';
import useNamespace from '@/hooks/use-namespace';
import useCluster from '@/hooks/use-cluster';

const { Text } = Typography;

export interface BaseFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
  children?: ReactNode;
  templateType: string;
  defaultValues: Record<string, any>;
  generateYaml: (values: any, template: any) => any;
  isClusterScoped?: boolean;
}

/**
 * 调度策略表单基类
 * 提供基础的表单布局和公共字段
 */
const BaseForm: FC<BaseFormProps> = (props) => {
  const { onOk, onCancel, children, templateType, defaultValues, generateYaml, isClusterScoped = false } = props;
  const [form] = Form.useForm();
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const { clusterList, loading: isClusterLoading } = useCluster();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 集群选项
  const clusterOptions = clusterList?.map(cluster => ({
    label: cluster.name,
    value: cluster.name
  })) || [];

  // 构建步骤数组
  const buildSteps = () => {
    const steps = [
      {
        title: i18nInstance.t('基本信息', '基本信息'),
        content: (
          <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }} size="small">
            <Form.Item 
              name="name" 
              label={i18nInstance.t('名称', '名称')}
              rules={[{ required: true, message: '请填写调度策略名称' }]}
              validateTrigger={['onChange', 'onBlur']}
            >
              <Input 
                placeholder="请输入调度策略名称" 
                id="policy-name"
              />
            </Form.Item>
            
            {!isClusterScoped && (
              <Form.Item 
                name="namespace" 
                label={i18nInstance.t('命名空间', '命名空间')}
                rules={[{ required: true, message: '请选择命名空间' }]}
                validateTrigger={['onChange', 'onBlur']}
              >
                <Select 
                  options={nsOptions} 
                  loading={isNsDataLoading}
                  showSearch 
                  placeholder="请选择命名空间"
                  id="policy-namespace"
                  filterOption={(input, option) => 
                    (option?.title ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  defaultValue={defaultValues.namespace || 'default'}
                />
              </Form.Item>
            )}
          </Space>
        )
      },
      {
        title: i18nInstance.t('资源选择器', '资源选择器'),
        content: (
          <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }} size="small">
            <Form.Item 
              name="resourceKind" 
              label={i18nInstance.t('资源类型', '资源类型')}
              rules={[{ required: true, message: '请选择资源类型' }]}
            >
              <Select
                options={[
                  { 
                    label: i18nInstance.t('常用资源', '常用资源'), 
                    options: [
                      { label: 'Deployment', value: 'Deployment' },
                      { label: 'Service', value: 'Service' },
                      { label: 'ConfigMap', value: 'ConfigMap' },
                      { label: 'Secret', value: 'Secret' },
                      { label: 'Ingress', value: 'Ingress' },
                    ] 
                  },
                  { 
                    label: i18nInstance.t('工作负载', '工作负载'), 
                    options: [
                      { label: 'Deployment', value: 'Deployment' },
                      { label: 'StatefulSet', value: 'StatefulSet' },
                      { label: 'DaemonSet', value: 'DaemonSet' },
                      { label: 'ReplicaSet', value: 'ReplicaSet' },
                      { label: 'Job', value: 'Job' },
                      { label: 'CronJob', value: 'CronJob' },
                    ] 
                  },
                  { 
                    label: i18nInstance.t('网络', '网络'), 
                    options: [
                      { label: 'Service', value: 'Service' },
                      { label: 'Ingress', value: 'Ingress' },
                      { label: 'NetworkPolicy', value: 'NetworkPolicy' },
                    ] 
                  },
                  { 
                    label: i18nInstance.t('存储', '存储'), 
                    options: [
                      { label: 'PersistentVolumeClaim', value: 'PersistentVolumeClaim' },
                      { label: 'StorageClass', value: 'StorageClass' },
                    ] 
                  },
                  { 
                    label: i18nInstance.t('配置', '配置'), 
                    options: [
                      { label: 'ConfigMap', value: 'ConfigMap' },
                      { label: 'Secret', value: 'Secret' },
                    ] 
                  },
                ]}
                placeholder="请选择资源类型"
                onChange={(value) => {
                  // 根据资源类型设置对应的API版本
                  switch(value) {
                    case 'Service':
                    case 'ConfigMap':
                    case 'Secret':
                    case 'PersistentVolumeClaim':
                    case 'Namespace':
                    case 'Node':
                      form.setFieldsValue({ resourceApiVersion: 'v1' });
                      break;
                    case 'Deployment':
                    case 'StatefulSet':
                    case 'DaemonSet':
                    case 'ReplicaSet':
                      form.setFieldsValue({ resourceApiVersion: 'apps/v1' });
                      break;
                    case 'Ingress':
                    case 'NetworkPolicy':
                      form.setFieldsValue({ resourceApiVersion: 'networking.k8s.io/v1' });
                      break;
                    case 'Job':
                    case 'CronJob':
                      form.setFieldsValue({ resourceApiVersion: 'batch/v1' });
                      break;
                    case 'StorageClass':
                      form.setFieldsValue({ resourceApiVersion: 'storage.k8s.io/v1' });
                      break;
                    default:
                      // 保留现有值
                      break;
                  }
                }}
              />
            </Form.Item>
            
            <Form.Item 
              name="resourceApiVersion" 
              label={i18nInstance.t('API版本', 'API版本')}
              rules={[{ required: true, message: '请填写API版本' }]}
              tooltip="不同资源类型对应不同的API版本，如Service为v1，Deployment为apps/v1"
            >
              <Input placeholder="例如: apps/v1, v1, networking.k8s.io/v1" />
            </Form.Item>
            
            <Form.Item 
              name="resourceName" 
              label={i18nInstance.t('资源名称', '资源名称')}
              tooltip="如果不指定名称，将匹配所有指定类型的资源"
            >
              <Input placeholder="可选，不填则匹配所有指定类型的资源" />
            </Form.Item>
          </Space>
        )
      },
      {
        title: i18nInstance.t('集群选择', '集群选择'),
        content: (
          <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }} size="small">
            <Form.Item 
              name="clusterNames" 
              label={i18nInstance.t('目标集群', '目标集群')}
              rules={[{ required: true, message: '请选择目标集群' }]}
            >
              <Select
                mode="multiple"
                allowClear
                loading={isClusterLoading}
                placeholder="请选择目标集群"
                options={clusterOptions}
                style={{ width: '100%' }}
              />
            </Form.Item>
            
            <Form.Item 
              name="replicaSchedulingType" 
              label={i18nInstance.t('副本调度类型', '副本调度类型')}
              rules={[{ required: true, message: '请选择副本调度类型' }]}
            >
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="Duplicated">
                    Duplicated
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      - 在每个集群中创建完整副本
                    </Text>
                  </Radio>
                  <Radio value="Divided">
                    Divided
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      - 将副本分配到不同集群中
                    </Text>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => 
                prevValues.replicaSchedulingType !== currentValues.replicaSchedulingType
              }
            >
              {({ getFieldValue }) => {
                const replicaType = getFieldValue('replicaSchedulingType');
                if (replicaType === 'Divided') {
                  return (
                    <>
                      <Form.Item 
                        name="divisionPreference" 
                        label={i18nInstance.t('分配偏好', '分配偏好')}
                        rules={[{ required: true, message: '请选择分配偏好' }]}
                      >
                        <Radio.Group>
                          <Radio value="Weighted">按权重分配</Radio>
                          <Radio value="Aggregated">按集群容量分配</Radio>
                        </Radio.Group>
                      </Form.Item>
                      
                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => 
                          prevValues.divisionPreference !== currentValues.divisionPreference ||
                          !_.isEqual(prevValues.clusterNames, currentValues.clusterNames)
                        }
                      >
                        {({ getFieldValue }) => {
                          const divisionPreference = getFieldValue('divisionPreference');
                          const selectedClusters = getFieldValue('clusterNames') || [];
                          
                          if (divisionPreference === 'Weighted' && selectedClusters.length > 0) {
                            return (
                              <div style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                                <div style={{ marginBottom: 8 }}>集群权重配置</div>
                                {selectedClusters.map((cluster: string, index: number) => (
                                  <Form.Item 
                                    key={cluster}
                                    name={['clusterWeights', cluster]} 
                                    label={`${cluster} 权重`}
                                    initialValue={1}
                                  >
                                    <Input type="number" min={1} style={{ width: 100 }} />
                                  </Form.Item>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      </Form.Item>
                    </>
                  );
                }
                return null;
              }}
            </Form.Item>
          </Space>
        )
      }
    ];

    // 如果有子组件，添加高级设置步骤
    if (children) {
      steps.push({
        title: i18nInstance.t('高级设置', '高级设置'),
        content: (
          <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }} size="small">
            {children}
          </Space>
        )
      });
    }

    return steps;
  };

  // 构建步骤列表
  const steps = buildSteps();

  // 处理标签和注释
  const parseKeyValuePairs = (input: string) => {
    if (!input || typeof input !== 'string') return {};
    
    const pairs = input.split(',');
    const result: Record<string, string> = {};
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=').map(item => item ? item.trim() : '');
      if (key && value) {
        result[key] = value;
      }
    });
    
    return result;
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // 获取所有表单数据
      const allFormValues = form.getFieldsValue(true);
      const mergedValues = { ...allFormValues };
      
      // 表单验证
      const values = await form.validateFields()
        .catch(errors => {
          console.error("表单验证错误:", errors);
          message.error("表单验证失败，请检查必填字段");
          setIsSubmitting(false);
          throw errors;
        });
      
      console.log("表单验证通过，提交的数据:", values);
      
      // 获取对应模板
      const template = schedulingPolicyTemplates.find(t => {
        if (isClusterScoped) {
          return t.type === 'ClusterScoped';
        } else {
          return t.type === 'NamespaceScoped';
        }
      });
      
      if (!template) {
        message.error('未找到对应的调度策略模板');
        setIsSubmitting(false);
        return;
      }

      // 处理表单数据
      const processedValues = {
        ...defaultValues,
        ...mergedValues,
        name: mergedValues.name ? mergedValues.name.trim() : '',
        namespace: !isClusterScoped ? (mergedValues.namespace || 'default') : undefined,
        clusterNames: mergedValues.clusterNames || [],
      };
      
      // 生成YAML
      const yamlObject = generateYaml(processedValues, template);
      
      if (!yamlObject) {
        message.error('生成YAML失败');
        setIsSubmitting(false);
        return;
      }

      console.log('准备创建调度策略:', { 
        isClusterScope: isClusterScoped,
        name: processedValues.name,
        namespace: processedValues.namespace,
        content: yamlObject
      });
      
      // 转换为YAML字符串
      const yamlString = JSON.stringify(yamlObject);
      
      // 创建调度策略
      const ret = await CreatePropagationPolicy({
        isClusterScope: isClusterScoped,
        name: processedValues.name,
        namespace: processedValues.namespace || '',
        propagationData: yamlString
      });

      if (ret.code === 200) {
        await onOk(ret);
        form.resetFields();
      } else {
        message.error(`创建失败: ${ret.message || '未知错误'}`);
        console.error('创建失败:', ret);
      }
    } catch (error) {
      console.error('表单验证或提交失败', error);
      message.error('创建失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 渲染步骤内容
  const renderContent = () => {
    return steps[currentStep].content;
  };

  // 渲染步骤导航
  const renderSteps = () => {
    return (
      <Steps
        current={currentStep}
        onChange={setCurrentStep}
        items={steps.map(item => ({ title: item.title }))}
        style={{ marginBottom: 8 }}
        size="small"
        labelPlacement="horizontal"
      />
    );
  };

  // 渲染底部按钮
  const renderFooter = () => {
    return (
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel}>
            {i18nInstance.t('取消', '取消')}
          </Button>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep(currentStep - 1)}>
              {i18nInstance.t('上一步', '上一步')}
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button type="primary" onClick={() => {
              form.validateFields()
                .then(() => {
                  setCurrentStep(currentStep + 1);
                })
                .catch((error) => {
                  console.error('表单验证失败:', error);
                });
            }}>
              {i18nInstance.t('下一步', '下一步')}
            </Button>
          ) : (
            <Button type="primary" onClick={() => {
              form.submit();
            }} loading={isSubmitting}>
              {i18nInstance.t('创建', '创建')}
            </Button>
          )}
        </Space>
      </div>
    );
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={defaultValues}
      onFinish={handleSubmit}
    >
      {renderSteps()}
      {renderContent()}
      {renderFooter()}
    </Form>
  );
};

export default BaseForm; 