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
import { FC, ReactNode, useState, ReactElement } from 'react';
import { App, Button, Form, Input, InputNumber, Select, Space, Steps, message, Radio, Typography } from 'antd';
import { parse } from 'yaml';
import _ from 'lodash';
import { CreateResource } from '@/services/unstructured';
import { IResponse } from '@/services/base.ts';
import useNamespace from '@/hooks/use-namespace.ts';

const { Text } = Typography;

export interface ServiceBaseFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
  children?: ReactNode;
  serviceType: string;
  defaultValues: Record<string, any>;
  generateYaml: (values: any) => any;
  selectorStep?: ReactElement; // 选择器步骤
  ingressConfigStep?: ReactElement; // Ingress特有配置步骤
}

/**
 * 服务表单基类
 * 提供基础的表单布局和公共字段
 */
const ServiceBaseForm: FC<ServiceBaseFormProps> = (props) => {
  const { onOk, onCancel, children, serviceType, defaultValues, generateYaml, selectorStep, ingressConfigStep } = props;
  const [form] = Form.useForm();
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { message } = App.useApp();

  // 构建步骤数组
  const buildSteps = () => {
    const baseSteps = [
      {
        title: i18nInstance.t('基本信息', '基本信息'),
        content: (
          <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }} size="small">
            <Form.Item 
              name="name" 
              label={i18nInstance.t('名称', '名称')}
              rules={[{ required: true, message: '请输入名称' }]}
            >
              <Input placeholder="请输入服务名称" />
            </Form.Item>
            
            <Form.Item 
              name="namespace" 
              label={i18nInstance.t('命名空间', '命名空间')}
              rules={[{ required: true, message: '请选择命名空间' }]}
            >
              <Select 
                options={nsOptions} 
                loading={isNsDataLoading}
                showSearch 
                placeholder="请选择命名空间"
              />
            </Form.Item>
            
            <Form.Item 
              name="labels" 
              label={i18nInstance.t('标签', '标签')}
              tooltip="格式为 key=value，多个标签使用逗号分隔"
            >
              <Input placeholder="例如: app=nginx,tier=frontend" />
            </Form.Item>
            
            <Form.Item 
              name="annotations" 
              label={i18nInstance.t('注释', '注释')}
              tooltip="格式为 key=value，多个注释使用逗号分隔"
            >
              <Input placeholder="例如: description=web server" />
            </Form.Item>

            {serviceType !== 'Ingress' && (
              <Form.Item 
                name="serviceType" 
                label={i18nInstance.t('服务类型', '服务类型')}
                rules={[{ required: true, message: '请选择服务类型' }]}
              >
                <Radio.Group>
                  <Radio value="ClusterIP">
                    ClusterIP
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      - 集群内部访问
                    </Text>
                  </Radio>
                  <Radio value="NodePort">
                    NodePort
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      - 通过节点端口访问
                    </Text>
                  </Radio>
                  <Radio value="LoadBalancer">
                    LoadBalancer
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      - 使用云提供商的负载均衡器
                    </Text>
                  </Radio>
                  <Radio value="ExternalName">
                    ExternalName
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      - 映射到外部域名
                    </Text>
                  </Radio>
                </Radio.Group>
              </Form.Item>
            )}
          </Space>
        )
      }
    ];

    // 构建完整步骤列表
    const steps = [...baseSteps];

    // 在基本信息后添加选择器步骤（如果有）
    if (selectorStep) {
      steps.push({
        title: i18nInstance.t('选择器配置', '选择器配置'),
        content: selectorStep
      });
    }
    
    // 添加端口配置步骤（仅对Service有效，非Ingress）
    if (serviceType !== 'Ingress') {
      steps.push({
        title: i18nInstance.t('端口配置', '端口配置'),
        content: (
          <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }} size="small">
            <div style={{ marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>端口映射</h4>
              <Text type="secondary">配置服务的端口映射关系</Text>
            </div>
            
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => 
                prevValues.serviceType !== currentValues.serviceType
              }
            >
              {({ getFieldValue }) => {
                const serviceType = getFieldValue('serviceType');
                
                // ExternalName类型不需要端口配置
                if (serviceType === 'ExternalName') {
                  return (
                    <Form.Item 
                      name="externalName" 
                      label={i18nInstance.t('外部名称', '外部名称')}
                      rules={[{ required: true, message: '请输入外部名称' }]}
                      tooltip="要映射的外部域名，如 api.example.com"
                    >
                      <Input placeholder="例如: api.example.com" />
                    </Form.Item>
                  );
                }
                
                return (
                  <>
                    <div className="port-config" style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                      <Space align="start" style={{ width: '100%' }}>
                        <Form.Item 
                          name="portName" 
                          style={{ width: 120, marginBottom: 0 }}
                        >
                          <Input placeholder="端口名称" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item 
                          name="protocol" 
                          style={{ width: 120, marginBottom: 0 }}
                        >
                          <Select
                            style={{ width: '100%' }}
                            options={[
                              { label: 'TCP', value: 'TCP' },
                              { label: 'UDP', value: 'UDP' },
                              { label: 'SCTP', value: 'SCTP' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item 
                          name="port" 
                          style={{ width: 120, marginBottom: 0 }}
                          rules={[{ required: true, message: '请输入服务端口' }]}
                        >
                          <InputNumber 
                            min={1} 
                            max={65535} 
                            placeholder="服务端口"
                            style={{ width: '100%' }} 
                          />
                        </Form.Item>
                        <Form.Item 
                          name="targetPort" 
                          style={{ width: 120, marginBottom: 0 }}
                          rules={[{ required: true, message: '请输入目标端口' }]}
                        >
                          <InputNumber 
                            min={1} 
                            max={65535} 
                            placeholder="目标端口"
                            style={{ width: '100%' }} 
                          />
                        </Form.Item>
                        
                        {serviceType === 'NodePort' && (
                          <Form.Item 
                            name="nodePort" 
                            style={{ width: 120, marginBottom: 0 }}
                          >
                            <InputNumber 
                              min={30000} 
                              max={32767} 
                              placeholder="节点端口"
                              style={{ width: '100%' }} 
                            />
                          </Form.Item>
                        )}
                      </Space>
                    </div>
                    
                    {serviceType === 'LoadBalancer' && (
                      <Form.Item 
                        name="loadBalancerIP" 
                        label={i18nInstance.t('负载均衡器IP', '负载均衡器IP')}
                        tooltip="负载均衡器的特定IP地址（如果支持）"
                      >
                        <Input placeholder="例如: 10.0.0.1" />
                      </Form.Item>
                    )}
                  </>
                );
              }}
            </Form.Item>
          </Space>
        )
      });
    }

    // 添加Ingress配置步骤（如果有）
    if (ingressConfigStep) {
      steps.push({
        title: i18nInstance.t('规则配置', '规则配置'),
        content: ingressConfigStep
      });
    }

    // 添加高级设置步骤
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
    if (!input || input.trim() === '') return {};
    
    const pairs = input.split(',');
    const result: Record<string, string> = {};
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=').map(item => item.trim());
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
      
      // 获取所有表单值，不经过验证
      const allFormValues = form.getFieldsValue(true);
      console.log("表单所有值(不通过验证):", allFormValues);
      
      // 手动验证关键字段
      const serviceName = form.getFieldValue('name');
      const serviceNamespace = form.getFieldValue('namespace');
      
      console.log("手动获取关键字段:", { name: serviceName, namespace: serviceNamespace });
      
      // 检查必填字段
      if (!serviceName || (typeof serviceName === 'string' && serviceName.trim() === '')) {
        console.error("服务名称不能为空");
        form.validateFields(['name']);
        setIsSubmitting(false);
        return;
      }
      
      if (!serviceNamespace || (typeof serviceNamespace === 'string' && serviceNamespace.trim() === '')) {
        console.error("命名空间不能为空");
        form.validateFields(['namespace']);
        setIsSubmitting(false);
        return;
      }
      
      // 验证所有字段
      const values = await form.validateFields()
        .catch(errors => {
          console.error("表单验证错误:", errors);
          setIsSubmitting(false);
          throw errors;
        });
      
      console.log("表单验证通过，提交的数据:", values);
      
      // 确保我们有所有表单数据
      const mergedValues = { ...allFormValues, ...values };
      
      // 处理标签和注释
      const labels = parseKeyValuePairs(mergedValues.labels || '');
      const annotations = parseKeyValuePairs(mergedValues.annotations || '');
      
      console.log('处理表单值:', {
        原始name: mergedValues.name,
        原始namespace: mergedValues.namespace,
        原始labels: mergedValues.labels,
        处理后labels: labels
      });
      
      // 合并处理后的值
      const processedValues = {
        ...defaultValues, // 先使用默认值作为基础
        ...mergedValues, // 然后使用表单输入的值覆盖
        name: mergedValues.name ? mergedValues.name.trim() : '',
        namespace: mergedValues.namespace || 'default',
        labels,
        annotations
      };
      
      // 生成YAML
      const yamlObject = generateYaml(processedValues);
      
      if (!yamlObject) {
        console.error('生成YAML失败');
        message.error(i18nInstance.t('生成YAML失败', '生成YAML失败'));
        setIsSubmitting(false);
        return;
      }

      console.log('生成的YAML对象:', yamlObject);

      // 获取资源类型和名称
      const kind = yamlObject.kind || serviceType;
      const namespace = yamlObject.metadata?.namespace || processedValues.namespace || 'default';
      const name = yamlObject.metadata?.name || processedValues.name || '';

      if (!kind) {
        console.error('资源类型不能为空');
        message.error(i18nInstance.t('资源类型不能为空', '资源类型不能为空'));
        setIsSubmitting(false);
        return;
      }
      
      if (!name) {
        console.error('服务名称不能为空');
        message.error(i18nInstance.t('服务名称不能为空', '服务名称不能为空'));
        setIsSubmitting(false);
        return;
      }
      
      if (!namespace) {
        console.error('命名空间不能为空');
        message.error(i18nInstance.t('命名空间不能为空', '命名空间不能为空'));
        setIsSubmitting(false);
        return;
      }

      console.log('准备创建服务:', { kind, name, namespace, content: yamlObject });
      
      // 在调用API之前确保metadata字段存在且包含必要信息
      if (!yamlObject.metadata) {
        yamlObject.metadata = {};
      }
      yamlObject.metadata.name = name;
      yamlObject.metadata.namespace = namespace;
      
      // 确保API参数完整
      const apiParams = {
        kind,
        name,
        namespace,
        content: yamlObject
      };
      
      console.log('最终API参数:', apiParams);
      
      // 创建资源
      const ret = await CreateResource(apiParams);

      console.log('API返回结果:', ret);

      if (ret.code === 200) {
        message.success(i18nInstance.t('创建成功', '创建成功'));
        await onOk(ret);
        form.resetFields();
      } else {
        console.error('创建失败:', ret);
        message.error(i18nInstance.t('创建失败', '创建失败') + ': ' + (ret.message || '未知错误'));
      }
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('表单验证或提交失败', error);
      message.error(i18nInstance.t('提交失败', '提交失败') + ': ' + (error.message || '未知错误'));
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
            <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
              {i18nInstance.t('下一步', '下一步')}
            </Button>
          ) : (
            <Button type="primary" onClick={handleSubmit} loading={isSubmitting}>
              {i18nInstance.t('确定', '确定')}
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
    >
      {renderSteps()}
      {renderContent()}
      {renderFooter()}
    </Form>
  );
};

export default ServiceBaseForm; 