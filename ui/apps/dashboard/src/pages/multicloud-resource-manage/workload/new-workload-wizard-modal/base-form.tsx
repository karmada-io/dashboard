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
              rules={[{ required: true, message: '请填写工作负载名称' }]}
              validateTrigger={['onChange', 'onBlur']}
            >
              <Input 
                placeholder="请输入工作负载名称" 
                id="workload-name"
                onChange={(e) => {
                  console.log('名称字段变化:', e.target.value);
                }}
              />
            </Form.Item>
            
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
                id="workload-namespace"
                onChange={(value) => {
                  console.log('命名空间变化:', value);
                  // 主动设置表单字段值，确保它被正确记录
                  form.setFieldsValue({ namespace: value });
                }}
                filterOption={(input, option) => 
                  (option?.title ?? '').toLowerCase().includes(input.toLowerCase())
                }
                defaultValue={defaultValues.namespace || 'default'}
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

  // 处理环境变量
  const parseEnvVars = (input: string) => {
    if (!input || typeof input !== 'string') return [];
    
    const pairs = input.split(',');
    return pairs.map(pair => {
      const [name, value] = pair.split('=').map(item => item ? item.trim() : '');
      return { name, value };
    }).filter(item => item.name && item.value);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // 触发表单验证前先获取所有值并打印出来
      const allValues = form.getFieldsValue(true);
      console.log("表单所有值(不通过验证):", allValues);
      
      // 如果表单值为空对象或未定义，显示错误
      if (!allValues || Object.keys(allValues).length === 0) {
        message.error("表单数据为空，无法提交");
        console.error("表单数据为空:", allValues);
        setIsSubmitting(false);
        return;
      }
      
      // 手动验证必填字段
      const workloadName = form.getFieldValue('name');
      const workloadNamespace = form.getFieldValue('namespace');
      
      console.log("手动获取关键字段:", { name: workloadName, namespace: workloadNamespace });
      
      // 检查必填字段
      if (!workloadName || (typeof workloadName === 'string' && workloadName.trim() === '')) {
        message.error("工作负载名称不能为空");
        form.validateFields(['name']);
        setIsSubmitting(false);
        return;
      }
      
      if (!workloadNamespace || (typeof workloadNamespace === 'string' && workloadNamespace.trim() === '')) {
        message.error("命名空间不能为空");
        form.validateFields(['namespace']);
        setIsSubmitting(false);
        return;
      }
      
      // 确保手动验证通过后再调用表单整体验证
      // 获取表单值并进行验证
      const values = await form.validateFields()
        .catch(errors => {
          console.error("表单验证错误:", errors);
          message.error("表单验证失败，请检查必填字段");
          setIsSubmitting(false);
          throw errors;
        });
      
      console.log("表单验证通过，提交的数据:", values);
      
      // 确保我们有所有表单数据，而不仅仅是验证后的部分
      const allFormValues = form.getFieldsValue(true);
      const mergedValues = { ...allFormValues, ...values };
      
      // 获取对应模板
      const template = workloadTemplates.find(t => t.type.toLowerCase() === templateType.toLowerCase());
      if (!template) {
        message.error('未找到对应的工作负载模板');
        setIsSubmitting(false);
        return;
      }

      // 处理标签和注释
      const labels = typeof mergedValues.labels === 'string' ? parseKeyValuePairs(mergedValues.labels) : (mergedValues.labels || {});
      const annotations = typeof mergedValues.annotations === 'string' ? parseKeyValuePairs(mergedValues.annotations) : (mergedValues.annotations || {});
      
      // 处理环境变量
      let envVars = mergedValues.envVars;
      if (typeof mergedValues.envVars === 'string') {
        envVars = parseEnvVars(mergedValues.envVars);
      } else if (!Array.isArray(mergedValues.envVars)) {
        envVars = [];
      }
      
      console.log('处理表单值:', {
        原始name: mergedValues.name,
        原始namespace: mergedValues.namespace,
        原始labels: mergedValues.labels,
        处理后labels: labels,
        原始envVars: mergedValues.envVars,
        处理后envVars: envVars
      });
      
      // 合并处理后的值
      const processedValues = {
        ...defaultValues, // 先使用默认值作为基础
        ...mergedValues, // 然后使用表单输入的值覆盖
        name: mergedValues.name ? mergedValues.name.trim() : '',
        namespace: mergedValues.namespace || 'default',
        labels,
        annotations,
        envVars,
        image: mergedValues.image || 'nginx:latest', // 确保image字段存在
      };
      
      // 生成YAML
      const yamlObject = generateYaml(processedValues, template);
      
      if (!yamlObject) {
        message.error('生成YAML失败');
        setIsSubmitting(false);
        return;
      }

      // 确保YAML对象包含必要的容器信息
      if (yamlObject.spec?.template?.spec?.containers && 
          yamlObject.spec.template.spec.containers.length > 0) {
        const container = yamlObject.spec.template.spec.containers[0];
        if (!container.image) {
          container.image = processedValues.image || 'nginx:latest';
        }
      }

      // 获取资源类型和名称
      const kind = yamlObject.kind || templateType;
      const namespace = yamlObject.metadata?.namespace || processedValues.namespace || workloadNamespace;
      const name = yamlObject.metadata?.name || processedValues.name || workloadName;

      if (!kind) {
        message.error('资源类型不能为空');
        console.error('资源类型不能为空');
        setIsSubmitting(false);
        return;
      }
      
      if (!name) {
        message.error('工作负载名称不能为空');
        console.error('工作负载名称不能为空');
        setIsSubmitting(false);
        return;
      }
      
      if (!namespace) {
        message.error('命名空间不能为空');
        console.error('命名空间不能为空');
        setIsSubmitting(false);
        return;
      }

      console.log('准备创建工作负载:', { kind, name, namespace, content: yamlObject });
      
      // 在调用API之前确保metadata字段存在且包含必要信息
      if (!yamlObject.metadata) {
        yamlObject.metadata = {};
      }
      yamlObject.metadata.name = name || '';
      yamlObject.metadata.namespace = namespace || 'default';
      
      // 确保API参数完整
      const apiParams = {
        kind: kind || 'Deployment',
        name: name || '',
        namespace: namespace || 'default',
        content: yamlObject
      };
      
      console.log('最终API参数:', apiParams);
      
      // 最后验证关键字段
      if (!apiParams.content.spec?.template?.spec?.containers?.[0]?.image) {
        console.error('容器镜像字段缺失，尝试修复');
        // 尝试修复缺失的镜像字段
        if (!apiParams.content.spec) apiParams.content.spec = {};
        if (!apiParams.content.spec.template) apiParams.content.spec.template = {};
        if (!apiParams.content.spec.template.spec) apiParams.content.spec.template.spec = {};
        if (!apiParams.content.spec.template.spec.containers) apiParams.content.spec.template.spec.containers = [{}];
        apiParams.content.spec.template.spec.containers[0].image = processedValues.image || 'nginx:latest';
      }
      
      // 打印最终YAML内容
      console.log('最终提交的YAML内容:', JSON.stringify(apiParams.content, null, 2));
      
      // 创建资源
      const ret = await CreateResource(apiParams);

      if (ret.code === 200) {
        // 不在这里显示成功消息，改为在父组件中统一处理
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
            {i18nInstance.t('625fb26b4b3340f7872b411f401e754c', '取消')}
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
              console.log('当前表单值:', form.getFieldsValue());
              // 使用form.submit()触发表单提交
              form.submit();
            }} loading={isSubmitting}>
              {i18nInstance.t('38cf16f2204ffab8a6e0187070558721', '创建')}
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
      onValuesChange={(changedValues, allValues) => {
        console.log('表单值变化:', { 变化的字段: changedValues, 所有字段: allValues });
      }}
      onFinish={handleSubmit}
    >
      {renderSteps()}
      {renderContent()}
      {renderFooter()}
    </Form>
  );
};

export default BaseForm; 