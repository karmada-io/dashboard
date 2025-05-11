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
import { FC } from 'react';
import { Form, Input, InputNumber, Radio, Space, Tooltip, Typography } from 'antd';
import { parse } from 'yaml';
import _ from 'lodash';
import { IResponse } from '@/services/base.ts';
import BaseForm from './base-form';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface JobFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

/**
 * Job表单组件
 */
const JobForm: FC<JobFormProps> = (props) => {
  const { onOk, onCancel } = props;

  // 默认表单值
  const defaultValues = {
    name: '',
    namespace: 'default',
    image: 'busybox:latest',
    command: 'echo "Hello World"',
    containerName: '',
    pullPolicy: 'IfNotPresent',
    cpuLimit: '500m',
    memoryLimit: '256Mi',
    cpuRequest: '250m',
    memoryRequest: '128Mi',
    completions: 1,
    parallelism: 1,
    backoffLimit: 6,
    activeDeadlineSeconds: '',
    ttlSecondsAfterFinished: 100,
    restartPolicy: 'Never',
    labels: 'app=job',
    hostNetwork: false,
    dnsPolicy: 'ClusterFirst',
    nodeSelector: '',
    tolerations: '',
  };

  // 根据表单数据生成YAML
  const generateYaml = (values: any, template: any) => {
    let yamlObj = parse(template.yaml);
    
    // 设置基础信息
    _.set(yamlObj, 'metadata.name', values.name);
    _.set(yamlObj, 'metadata.namespace', values.namespace);
    
    // 设置标签和注释
    if (Object.keys(values.labels).length > 0) {
      _.set(yamlObj, 'metadata.labels', values.labels);
      _.set(yamlObj, 'spec.template.metadata.labels', values.labels);
    }
    
    if (Object.keys(values.annotations).length > 0) {
      _.set(yamlObj, 'metadata.annotations', values.annotations);
      _.set(yamlObj, 'spec.template.metadata.annotations', values.annotations);
    }
    
    // 设置Job特性
    _.set(yamlObj, 'spec.completions', values.completions);
    _.set(yamlObj, 'spec.parallelism', values.parallelism);
    _.set(yamlObj, 'spec.backoffLimit', values.backoffLimit);
    
    if (values.activeDeadlineSeconds) {
      _.set(yamlObj, 'spec.activeDeadlineSeconds', parseInt(values.activeDeadlineSeconds));
    }
    
    if (values.ttlSecondsAfterFinished) {
      _.set(yamlObj, 'spec.ttlSecondsAfterFinished', parseInt(values.ttlSecondsAfterFinished));
    }
    
    // 设置容器信息
    const containerName = values.containerName || values.name;
    _.set(yamlObj, 'spec.template.spec.containers[0].name', containerName);
    _.set(yamlObj, 'spec.template.spec.containers[0].image', values.image);
    
    // 设置镜像拉取策略
    if (values.pullPolicy) {
      _.set(yamlObj, 'spec.template.spec.containers[0].imagePullPolicy', values.pullPolicy);
    }
    
    // 设置命令和参数
    if (values.command) {
      const cmdArray = values.command.split(' ').filter(Boolean);
      if (cmdArray.length > 0) {
        _.set(yamlObj, 'spec.template.spec.containers[0].command', cmdArray);
      }
    }
    
    if (values.args) {
      const argsArray = values.args.split(' ').filter(Boolean);
      if (argsArray.length > 0) {
        _.set(yamlObj, 'spec.template.spec.containers[0].args', argsArray);
      }
    }
    
    // 设置环境变量
    if (values.envVars && values.envVars.length > 0) {
      _.set(yamlObj, 'spec.template.spec.containers[0].env', values.envVars);
    }
    
    // 设置资源限制
    if (values.cpuRequest || values.memoryRequest || values.cpuLimit || values.memoryLimit) {
      const resources: any = {
        limits: {},
        requests: {},
      };
      
      if (values.cpuLimit) resources.limits.cpu = values.cpuLimit;
      if (values.memoryLimit) resources.limits.memory = values.memoryLimit;
      if (values.cpuRequest) resources.requests.cpu = values.cpuRequest;
      if (values.memoryRequest) resources.requests.memory = values.memoryRequest;
      
      _.set(yamlObj, 'spec.template.spec.containers[0].resources', resources);
    }
    
    // 设置重启策略
    _.set(yamlObj, 'spec.template.spec.restartPolicy', values.restartPolicy);
    
    // 设置网络配置
    if (values.hostNetwork !== undefined) {
      _.set(yamlObj, 'spec.template.spec.hostNetwork', values.hostNetwork);
    }
    
    if (values.dnsPolicy) {
      _.set(yamlObj, 'spec.template.spec.dnsPolicy', values.dnsPolicy);
    }
    
    // 设置节点选择器
    if (values.nodeSelector) {
      const nodeSelectorObj: Record<string, string> = {};
      const pairs = values.nodeSelector.split(',');
      
      pairs.forEach((pair: string) => {
        const [key, value] = pair.split('=').map((item: string) => item.trim());
        if (key && value) {
          _.set(nodeSelectorObj, key, value);
        }
      });
      
      if (Object.keys(nodeSelectorObj).length > 0) {
        _.set(yamlObj, 'spec.template.spec.nodeSelector', nodeSelectorObj);
      }
    }
    
    // 设置容忍度
    if (values.tolerations) {
      const tolerationsArray: Array<{
        key: string;
        operator: string;
        value: string;
        effect: string;
      }> = [];
      const pairs = values.tolerations.split(',');
      
      pairs.forEach((pair: string) => {
        const [key, value] = pair.split('=').map((item: string) => item.trim());
        if (key && value) {
          tolerationsArray.push({
            key,
            operator: 'Equal',
            value,
            effect: 'NoSchedule',
          });
        }
      });
      
      if (tolerationsArray.length > 0) {
        _.set(yamlObj, 'spec.template.spec.tolerations', tolerationsArray);
      }
    }
    
    return yamlObj;
  };

  // 增加额外步骤 - 任务信息
  const JobInfoStep = (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div style={{ marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Job 配置</h4>
        <Text type="secondary">一次性任务配置</Text>
      </div>
      
      <Form.Item 
        name="command" 
        label={i18nInstance.t('执行命令', '执行命令')}
        rules={[{ required: true, message: '请输入执行命令' }]}
      >
        <Input.TextArea placeholder='例如: echo "Hello World"' autoSize={{ minRows: 2, maxRows: 4 }} />
      </Form.Item>
      
      <Space>
        <Form.Item 
          name="completions" 
          label={
            <Space>
              <span>{i18nInstance.t('完成次数', '完成次数')}</span>
              <Tooltip title="Job需要成功完成的Pod数量">
                <InfoCircleOutlined />
              </Tooltip>
            </Space>
          }
          rules={[{ required: true, message: '请输入完成次数' }]}
          style={{ minWidth: 160 }}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item 
          name="parallelism" 
          label={
            <Space>
              <span>{i18nInstance.t('并行数量', '并行数量')}</span>
              <Tooltip title="Job在任一时刻可以并行运行的Pod数量">
                <InfoCircleOutlined />
              </Tooltip>
            </Space>
          }
          rules={[{ required: true, message: '请输入并行数量' }]}
          style={{ minWidth: 160 }}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
      </Space>
      
      <Space>
        <Form.Item 
          name="backoffLimit" 
          label={
            <Space>
              <span>{i18nInstance.t('失败重试次数', '失败重试次数')}</span>
              <Tooltip title="Job失败后最多重试的次数">
                <InfoCircleOutlined />
              </Tooltip>
            </Space>
          }
          style={{ minWidth: 160 }}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item 
          name="activeDeadlineSeconds" 
          label={
            <Space>
              <span>{i18nInstance.t('执行时限(秒)', '执行时限(秒)')}</span>
              <Tooltip title="Job可以运行的最长时间，超过时间则终止">
                <InfoCircleOutlined />
              </Tooltip>
            </Space>
          }
          style={{ minWidth: 160 }}
        >
          <InputNumber min={0} placeholder="不限制" style={{ width: '100%' }} />
        </Form.Item>
      </Space>

      <Form.Item 
        name="ttlSecondsAfterFinished" 
        label={
          <Space>
            <span>{i18nInstance.t('完成后保留时间(秒)', '完成后保留时间(秒)')}</span>
            <Tooltip title="Job完成后保留多长时间">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
      >
        <InputNumber min={0} placeholder="如: 100" />
      </Form.Item>
      
      <Form.Item 
        name="restartPolicy" 
        label={i18nInstance.t('重启策略', '重启策略')}
      >
        <Radio.Group>
          <Radio value="Never">Never (从不重启)</Radio>
          <Radio value="OnFailure">OnFailure (失败时重启)</Radio>
        </Radio.Group>
      </Form.Item>
    </Space>
  );

  return (
    <BaseForm
      onOk={onOk}
      onCancel={onCancel}
      templateType="Job"
      defaultValues={defaultValues}
      generateYaml={generateYaml}
      jobInfoStep={JobInfoStep}
    >
      {/* 高级设置部分为空，任务信息已通过jobInfoStep传递 */}
    </BaseForm>
  );
};

export default JobForm;