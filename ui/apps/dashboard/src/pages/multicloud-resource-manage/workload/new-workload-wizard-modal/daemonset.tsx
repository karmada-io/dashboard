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
import { Form, Input, Radio, Space } from 'antd';
import { parse } from 'yaml';
import _ from 'lodash';
import { IResponse } from '@/services/base.ts';
import BaseForm from './base-form';

interface DaemonsetFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

/**
 * DaemonSet表单组件
 */
const DaemonsetForm: FC<DaemonsetFormProps> = (props) => {
  const { onOk, onCancel } = props;

  // 默认表单值
  const defaultValues = {
    name: '',
    namespace: 'default',
    image: 'nginx:latest',
    containerPort: 80,
    portProtocol: 'TCP',
    portName: '',
    hostPort: '',
    containerName: '',
    pullPolicy: 'IfNotPresent',
    cpuLimit: '500m',
    memoryLimit: '256Mi',
    cpuRequest: '250m',
    memoryRequest: '128Mi',
    updateStrategy: 'RollingUpdate',
    maxUnavailable: '25%',
    labels: 'app=nginx',
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
      _.set(yamlObj, 'spec.selector.matchLabels', values.labels);
      _.set(yamlObj, 'spec.template.metadata.labels', values.labels);
    }
    
    if (Object.keys(values.annotations).length > 0) {
      _.set(yamlObj, 'metadata.annotations', values.annotations);
      _.set(yamlObj, 'spec.template.metadata.annotations', values.annotations);
    }
    
    // 设置容器信息
    const containerName = values.containerName || values.name;
    _.set(yamlObj, 'spec.template.spec.containers[0].name', containerName);
    _.set(yamlObj, 'spec.template.spec.containers[0].image', values.image);
    
    // 设置镜像拉取策略
    if (values.pullPolicy) {
      _.set(yamlObj, 'spec.template.spec.containers[0].imagePullPolicy', values.pullPolicy);
    }
    
    // 设置端口
    if (values.containerPort) {
      const portConfig: {
        containerPort: number;
        protocol: string;
        name?: string;
        hostPort?: number;
      } = {
        containerPort: parseInt(values.containerPort),
        protocol: values.portProtocol || 'TCP'
      };
      
      // 如果设置了端口名称
      if (values.portName) {
        portConfig.name = values.portName;
      }
      
      // 如果设置了宿主机端口
      if (values.hostPort) {
        portConfig.hostPort = parseInt(values.hostPort);
      }
      
      _.set(yamlObj, 'spec.template.spec.containers[0].ports[0]', portConfig);
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
    
    // 设置更新策略
    _.set(yamlObj, 'spec.updateStrategy.type', values.updateStrategy);
    
    if (values.updateStrategy === 'RollingUpdate') {
      _.set(yamlObj, 'spec.updateStrategy.rollingUpdate.maxUnavailable', values.maxUnavailable);
    }
    
    // 设置主机网络
    if (values.hostNetwork !== undefined) {
      _.set(yamlObj, 'spec.template.spec.hostNetwork', values.hostNetwork);
    }
    
    // 设置DNS策略
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

  return (
    <BaseForm
      onOk={onOk}
      onCancel={onCancel}
      templateType="Daemonset"
      defaultValues={defaultValues}
      generateYaml={generateYaml}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Form.Item 
          name="updateStrategy" 
          label={i18nInstance.t('更新策略', '更新策略')}
        >
          <Radio.Group>
            <Radio value="RollingUpdate">滚动更新 (RollingUpdate)</Radio>
            <Radio value="OnDelete">删除时更新 (OnDelete)</Radio>
          </Radio.Group>
        </Form.Item>
        
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => 
            prevValues.updateStrategy !== currentValues.updateStrategy
          }
        >
          {({ getFieldValue }) => {
            const updateStrategy = getFieldValue('updateStrategy');
            if (updateStrategy === 'RollingUpdate') {
              return (
                <Form.Item 
                  name="maxUnavailable" 
                  label={i18nInstance.t('最大不可用数量', '最大不可用数量')}
                  tooltip="最大不可用的Pod数量，可以是百分比或整数"
                >
                  <Input placeholder="例如: 25%" />
                </Form.Item>
              );
            }
            return null;
          }}
        </Form.Item>
      </Space>
    </BaseForm>
  );
};

export default DaemonsetForm;
