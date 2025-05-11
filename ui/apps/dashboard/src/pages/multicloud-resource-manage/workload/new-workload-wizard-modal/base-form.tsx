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
import { Button, Form, Input, InputNumber, Select, Space, Steps, message, Radio, Typography } from 'antd';
import { parse } from 'yaml';
import _ from 'lodash';
import { CreateResource } from '@/services/unstructured';
import { IResponse } from '@/services/base.ts';
import { workloadTemplates } from '../workloadTemplates';
import useNamespace from '@/hooks/use-namespace.ts';

const { Text } = Typography;

export interface BaseFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
  children?: ReactNode;
  templateType: string;
  defaultValues: Record<string, any>;
  generateYaml: (values: any, template: any) => any;
  showReplicas?: boolean;
  jobInfoStep?: ReactElement; // Job特有的任务信息步骤
  cronScheduleStep?: ReactElement; // CronJob特有的定时调度步骤
}

/**
 * 工作负载表单基类
 * 提供基础的表单布局和公共字段
 */
const BaseForm: FC<BaseFormProps> = (props) => {
  const { onOk, onCancel, children, templateType, defaultValues, generateYaml, showReplicas = false, jobInfoStep, cronScheduleStep } = props;
  const [form] = Form.useForm();
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
              <Input placeholder="请输入工作负载名称" />
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

            {showReplicas && (
              <Form.Item 
                name="replicas" 
                label={i18nInstance.t('副本数', '副本数')}
                rules={[{ required: true, message: '请输入副本数' }]}
              >
                <InputNumber min={0} placeholder="1" />
              </Form.Item>
            )}
          </Space>
        )
      }
    ];

    // 构建完整步骤列表
    const steps = [...baseSteps];

    // 在基本信息后添加CronJob定时调度步骤
    if (cronScheduleStep) {
      steps.push({
        title: i18nInstance.t('定时调度', '定时调度'),
        content: cronScheduleStep
      });
    }

    // 在基本信息或定时调度后添加Job任务信息步骤
    if (jobInfoStep) {
      steps.push({
        title: i18nInstance.t('任务信息', '任务信息'),
        content: jobInfoStep
      });
    }

    // 添加容器配置步骤
    steps.push({
      title: i18nInstance.t('容器配置', '容器配置'),
      content: (
        <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }} size="small">
          <Form.Item 
            name="image" 
            label={i18nInstance.t('镜像', '镜像')}
            rules={[{ required: true, message: '请输入镜像' }]}
          >
            <Input placeholder="例如: nginx:latest" />
          </Form.Item>
          
          <Space>
            <Form.Item 
              name="containerName" 
              label={i18nInstance.t('容器名称', '容器名称')}
              style={{ minWidth: 200 }}
            >
              <Input placeholder="默认使用应用名称" style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item 
              name="pullPolicy" 
              label={i18nInstance.t('镜像拉取策略', '镜像拉取策略')}
              style={{ minWidth: 240 }}
            >
              <Select
                options={[
                  { label: 'Always - 总是拉取', value: 'Always' },
                  { label: 'IfNotPresent - 本地不存在时拉取', value: 'IfNotPresent' },
                  { label: 'Never - 从不拉取', value: 'Never' },
                ]}
                placeholder="请选择镜像拉取策略"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>
          
          <Space align="start">
            <Form.Item 
              name="command" 
              label={i18nInstance.t('启动命令', '启动命令')}
              tooltip="多个命令使用空格分隔"
              style={{ minWidth: 240 }}
            >
              <Input placeholder='例如: /bin/sh -c "echo hello"' style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item 
              name="args" 
              label={i18nInstance.t('命令参数', '命令参数')}
              tooltip="多个参数使用空格分隔"
              style={{ minWidth: 200 }}
            >
              <Input placeholder='例如: arg1 arg2 arg3' style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          
          <Form.Item
            label={i18nInstance.t('环境变量', '环境变量')}
            tooltip="格式为 key=value，多个变量使用逗号分隔"
            name="envVars"
          >
            <Input.TextArea 
              placeholder="例如: ENV_VAR1=value1,ENV_VAR2=value2" 
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>

          <div style={{ marginBottom: 8, marginTop: 8 }}>
            <h4 style={{ margin: 0 }}>容器端口</h4>
          </div>
          
          <div className="container-port-config" style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
            <Space align="start" style={{ width: '100%' }}>
              <Form.Item 
                name="portProtocol" 
                style={{ width: 150, marginBottom: 0 }}
              >
                <Select
                  defaultValue="TCP"
                  style={{ width: '100%' }}
                  options={[
                    { label: 'TCP (默认)', value: 'TCP' },
                    { label: 'UDP', value: 'UDP' },
                    { label: 'SCTP', value: 'SCTP' },
                  ]}
                />
              </Form.Item>
              <Form.Item 
                name="portName" 
                style={{ width: 150, marginBottom: 0 }}
              >
                <Input placeholder="端口名称" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item 
                name="containerPort" 
                style={{ width: 150, marginBottom: 0 }}
              >
                <InputNumber 
                  min={1} 
                  max={65535} 
                  placeholder="容器端口"
                  style={{ width: '100%' }} 
                />
              </Form.Item>
              <Form.Item 
                name="hostPort" 
                style={{ width: 150, marginBottom: 0 }}
              >
                <InputNumber 
                  min={1} 
                  max={65535} 
                  placeholder="宿主机端口"
                  style={{ width: '100%' }} 
                />
              </Form.Item>
            </Space>
          </div>
        </Space>
      )
    });

    // 添加网络配置步骤
    steps.push({
      title: i18nInstance.t('网络配置', '网络配置'),
      content: (
        <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }} size="small">
          <Form.Item 
            name="hostNetwork" 
            label={i18nInstance.t('使用主机网络', '使用主机网络')}
            tooltip="使用主机网络时，Pod可以直接访问主机网络接口"
          >
            <Radio.Group>
              <Radio value={true}>
                是
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  - Pod将使用主机网络
                </Text>
              </Radio>
              <Radio value={false}>
                否
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  - Pod将使用独立网络
                </Text>
              </Radio>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item 
            name="dnsPolicy" 
            label={i18nInstance.t('DNS策略', 'DNS策略')}
          >
            <Radio.Group>
              <Radio value="ClusterFirst">
                ClusterFirst
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  - 优先使用集群DNS
                </Text>
              </Radio>
              <Radio value="Default">
                Default
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  - 使用节点的DNS
                </Text>
              </Radio>
              <Radio value="None">
                None
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  - 忽略DNS设置
                </Text>
              </Radio>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item 
            name="nodeSelector" 
            label={i18nInstance.t('节点选择器', '节点选择器')}
            tooltip="格式为 key=value，多个条件使用逗号分隔"
          >
            <Input placeholder="例如: disk=ssd,region=us-west" />
          </Form.Item>
          
          <Form.Item 
            name="tolerations" 
            label={i18nInstance.t('容忍度', '容忍度')}
            tooltip="格式为 key=value，多个容忍度使用逗号分隔"
          >
            <Input placeholder="例如: node-role=master,app=critical" />
          </Form.Item>
        </Space>
      )
    });

    // 添加资源限制步骤
    steps.push({
      title: i18nInstance.t('资源限制', '资源限制'),
      content: (
        <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }} size="small">
          <div style={{ marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>CPU 配置</h4>
          </div>
          
          <Space>
            <Form.Item 
              name="cpuRequest" 
              label={i18nInstance.t('CPU请求', 'CPU请求')}
            >
              <Input placeholder="例如: 250m" />
            </Form.Item>
            
            <Form.Item 
              name="cpuLimit" 
              label={i18nInstance.t('CPU限制', 'CPU限制')}
            >
              <Input placeholder="例如: 500m" />
            </Form.Item>
          </Space>
          
          <div style={{ marginBottom: 8, marginTop: 8 }}>
            <h4 style={{ margin: 0 }}>内存配置</h4>
          </div>
          
          <Space>
            <Form.Item 
              name="memoryRequest" 
              label={i18nInstance.t('内存请求', '内存请求')}
            >
              <Input placeholder="例如: 128Mi" />
            </Form.Item>
            
            <Form.Item 
              name="memoryLimit" 
              label={i18nInstance.t('内存限制', '内存限制')}
            >
              <Input placeholder="例如: 256Mi" />
            </Form.Item>
          </Space>
        </Space>
      )
    });

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

  // 处理环境变量
  const parseEnvVars = (input: string) => {
    if (!input || input.trim() === '') return [];
    
    const pairs = input.split(',');
    return pairs.map(pair => {
      const [name, value] = pair.split('=').map(item => item.trim());
      return { name, value };
    }).filter(item => item.name && item.value);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      
      // 获取对应模板
      const template = workloadTemplates.find(t => t.type.toLowerCase() === templateType.toLowerCase());
      if (!template) {
        message.error('未找到对应的工作负载模板');
        setIsSubmitting(false);
        return;
      }

      // 处理标签和注释
      const labels = parseKeyValuePairs(values.labels || '');
      const annotations = parseKeyValuePairs(values.annotations || '');
      
      // 处理环境变量
      const envVars = parseEnvVars(values.envVars || '');
      
      // 合并处理后的值
      const processedValues = {
        ...values,
        labels,
        annotations,
        envVars,
      };
      
      // 生成YAML
      const yamlObject = generateYaml(processedValues, template);
      
      if (!yamlObject) {
        setIsSubmitting(false);
        return;
      }

      const kind = _.get(yamlObject, 'kind');
      const namespace = _.get(yamlObject, 'metadata.namespace');
      const name = _.get(yamlObject, 'metadata.name');

      // 创建资源
      const ret = await CreateResource({
        kind,
        name,
        namespace,
        content: yamlObject,
      });

      await onOk(ret);
      form.resetFields();
      setIsSubmitting(false);
    } catch (error) {
      console.error('表单验证失败', error);
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
            {i18nInstance.t('625fb26b4b3340f7872b411f401e754c', '取消')}
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
              {i18nInstance.t('38cf16f2204ffab8a6e0187070558721', '确定')}
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

export default BaseForm; 