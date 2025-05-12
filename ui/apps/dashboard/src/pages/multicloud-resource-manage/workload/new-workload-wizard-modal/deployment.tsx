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
import { Form, Input, InputNumber, Radio, Select, Space, Checkbox } from 'antd';
import { parse } from 'yaml';
import _ from 'lodash';
import { IResponse } from '@/services/base.ts';
import BaseForm from './base-form';

interface DeploymentFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

/**
 * Deployment表单组件
 */
const DeploymentForm: FC<DeploymentFormProps> = (props) => {
  const { onOk, onCancel } = props;

  // 默认表单值
  const defaultValues = {
    name: '',
    namespace: 'default',
    replicas: 1,
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
    maxSurge: '25%',
    maxUnavailable: '25%',
    labels: 'app=nginx',
    nodeSelector: '',
    tolerations: '',
    hostNetwork: false,
    dnsPolicy: 'ClusterFirst'
  };

  // 根据表单数据生成YAML
  const generateYaml = (values: any, template: any) => {
    try {
      console.log('Deployment表单生成YAML，输入值:', values);
      let yamlObj = parse(template.yaml);
      
      // 设置基础信息
      yamlObj.metadata = yamlObj.metadata || {};
      yamlObj.metadata.name = values.name || '';
      yamlObj.metadata.namespace = values.namespace || 'default';
      
      console.log('设置名称和命名空间:', {
        name: values.name,
        namespace: values.namespace,
        yamlObj: yamlObj
      });
      
      // 设置标签和注释
      if (values.labels && typeof values.labels === 'object' && Object.keys(values.labels).length > 0) {
        yamlObj.metadata.labels = values.labels;
        
        // 确保spec和selector存在
        yamlObj.spec = yamlObj.spec || {};
        yamlObj.spec.selector = yamlObj.spec.selector || {};
        yamlObj.spec.selector.matchLabels = values.labels;
        
        // 确保template存在
        yamlObj.spec.template = yamlObj.spec.template || {};
        yamlObj.spec.template.metadata = yamlObj.spec.template.metadata || {};
        yamlObj.spec.template.metadata.labels = values.labels;
      } else if (typeof values.labels === 'string' && values.labels.trim() !== '') {
        // 处理字符串格式的标签
        const labelsObj: Record<string, string> = {};
        values.labels.split(',').forEach((label: string) => {
          const [key, value] = label.split('=').map((item: string) => item.trim());
          if (key && value) {
            labelsObj[key] = value;
          }
        });
        
        if (Object.keys(labelsObj).length > 0) {
          yamlObj.metadata.labels = labelsObj;
          
          // 设置选择器
          yamlObj.spec = yamlObj.spec || {};
          yamlObj.spec.selector = yamlObj.spec.selector || {};
          yamlObj.spec.selector.matchLabels = labelsObj;
          
          // 设置模板标签
          yamlObj.spec.template = yamlObj.spec.template || {};
          yamlObj.spec.template.metadata = yamlObj.spec.template.metadata || {};
          yamlObj.spec.template.metadata.labels = labelsObj;
        } else {
          // 使用应用名称作为标签
          const appLabel = { app: values.name || 'nginx' };
          yamlObj.metadata.labels = appLabel;
          
          // 设置选择器
          yamlObj.spec = yamlObj.spec || {};
          yamlObj.spec.selector = yamlObj.spec.selector || {};
          yamlObj.spec.selector.matchLabels = appLabel;
          
          // 设置模板标签
          yamlObj.spec.template = yamlObj.spec.template || {};
          yamlObj.spec.template.metadata = yamlObj.spec.template.metadata || {};
          yamlObj.spec.template.metadata.labels = appLabel;
        }
      } else {
        // 默认使用应用名称作为标签
        const appLabel = { app: values.name || 'nginx' };
        yamlObj.metadata.labels = appLabel;
        
        // 设置选择器
        yamlObj.spec = yamlObj.spec || {};
        yamlObj.spec.selector = yamlObj.spec.selector || {};
        yamlObj.spec.selector.matchLabels = appLabel;
        
        // 设置模板标签
        yamlObj.spec.template = yamlObj.spec.template || {};
        yamlObj.spec.template.metadata = yamlObj.spec.template.metadata || {};
        yamlObj.spec.template.metadata.labels = appLabel;
      }
      
      if (Object.keys(values.annotations).length > 0) {
        yamlObj.metadata.annotations = values.annotations;
        
        // 设置模板注释
        yamlObj.spec.template.metadata.annotations = values.annotations;
      }
      
      // 设置副本数
      yamlObj.spec.replicas = parseInt(values.replicas) || 1;
      
      // 设置容器
      yamlObj.spec.template.spec = yamlObj.spec.template.spec || {};
      yamlObj.spec.template.spec.containers = yamlObj.spec.template.spec.containers || [{}];
      
      // 设置容器信息
      const container = yamlObj.spec.template.spec.containers[0] || {};
      container.name = values.containerName || values.name || 'container-1';
      
      // 确保image始终有效
      container.image = values.image || 'nginx:latest';
      
      // 设置镜像拉取策略
      if (values.pullPolicy) {
        container.imagePullPolicy = values.pullPolicy;
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
        
        container.ports = [portConfig];
      }
      
      // 设置命令和参数
      if (values.command) {
        const cmdArray = values.command.split(' ').filter(Boolean);
        if (cmdArray.length > 0) {
          container.command = cmdArray;
        }
      }
      
      if (values.args) {
        const argsArray = values.args.split(' ').filter(Boolean);
        if (argsArray.length > 0) {
          container.args = argsArray;
        }
      }
      
      // 设置环境变量
      if (values.envVars && values.envVars.length > 0) {
        container.env = values.envVars;
      }
      
      // 设置资源限制
      if (values.cpuRequest || values.memoryRequest || values.cpuLimit || values.memoryLimit) {
        container.resources = container.resources || {};
        container.resources.limits = container.resources.limits || {};
        container.resources.requests = container.resources.requests || {};
        
        if (values.cpuLimit) container.resources.limits.cpu = values.cpuLimit;
        if (values.memoryLimit) container.resources.limits.memory = values.memoryLimit;
        if (values.cpuRequest) container.resources.requests.cpu = values.cpuRequest;
        if (values.memoryRequest) container.resources.requests.memory = values.memoryRequest;
      }
      
      // 更新容器
      yamlObj.spec.template.spec.containers[0] = container;
      
      // 最后再检查一次确保关键字段存在
      if (!yamlObj.spec.template.spec.containers[0].image) {
        yamlObj.spec.template.spec.containers[0].image = values.image || 'nginx:latest';
      }
      
      // 验证YAML对象的完整性
      const validateYamlObject = (obj: any) => {
        if (!obj.apiVersion) {
          obj.apiVersion = 'apps/v1';
        }
        
        if (!obj.kind) {
          obj.kind = 'Deployment';
        }
        
        if (!obj.metadata) {
          obj.metadata = {};
        }
        
        if (!obj.metadata.name) {
          obj.metadata.name = values.name || '';
        }
        
        if (!obj.metadata.namespace) {
          obj.metadata.namespace = values.namespace || 'default';
        }
        
        // 重设标签确保一致性
        const appLabel = { app: values.name || 'nginx' };
        if ((!obj.metadata.labels || Object.keys(obj.metadata.labels).length === 0) && 
            (!values.labels || typeof values.labels !== 'object' || Object.keys(values.labels).length === 0)) {
          obj.metadata.labels = appLabel;
        } else if (typeof values.labels === 'string' && values.labels.trim() !== '') {
          // 处理字符串格式的标签
          const labelsObj: Record<string, string> = {};
          values.labels.split(',').forEach((label: string) => {
            const [key, value] = label.split('=').map((item: string) => item.trim());
            if (key && value) {
              labelsObj[key] = value;
            }
          });
          
          if (Object.keys(labelsObj).length > 0) {
            obj.metadata.labels = labelsObj;
          } else {
            obj.metadata.labels = appLabel;
          }
        }
        
        if (!obj.spec) {
          obj.spec = {};
        }
        
        if (!obj.spec.selector) {
          obj.spec.selector = {
            matchLabels: obj.metadata.labels || appLabel
          };
        }
        
        if (!obj.spec.template) {
          obj.spec.template = {
            metadata: {
              labels: obj.metadata.labels || appLabel
            },
            spec: {
              containers: [{
                name: values.containerName || values.name || 'container-1',
                image: values.image || 'nginx:latest'
              }]
            }
          };
        } else if (!obj.spec.template.metadata) {
          obj.spec.template.metadata = { 
            labels: obj.metadata.labels || appLabel 
          };
        } else if (!obj.spec.template.metadata.labels) {
          obj.spec.template.metadata.labels = obj.metadata.labels || appLabel;
        }
        
        // 确保选择器标签与Pod模板标签匹配
        obj.spec.selector.matchLabels = {...obj.spec.template.metadata.labels};
        
        // 确保容器配置完整
        const container = obj.spec.template.spec.containers[0];
        if (!container.resources) {
          container.resources = {
            limits: {
              cpu: values.cpuLimit || '500m',
              memory: values.memoryLimit || '256Mi'
            },
            requests: {
              cpu: values.cpuRequest || '250m',
              memory: values.memoryRequest || '128Mi'
            }
          };
        }

        // 确保网络配置完整
        if (values.hostNetwork !== undefined) {
          obj.spec.template.spec.hostNetwork = values.hostNetwork;
        }
        
        if (values.dnsPolicy) {
          obj.spec.template.spec.dnsPolicy = values.dnsPolicy;
        }

        // 确保imagePolicy设置
        if (values.pullPolicy) {
          container.imagePullPolicy = values.pullPolicy;
        }

        // 确保端口设置
        if (values.containerPort && !container.ports) {
          container.ports = [{
            containerPort: parseInt(values.containerPort),
            protocol: values.portProtocol || 'TCP'
          }];
        }

        // 添加常见卷挂载如果没有设置
        if (!obj.spec.template.spec.volumes) {
          obj.spec.template.spec.volumes = [{
            name: 'data',
            emptyDir: {}
          }];
        }
        
        if (!container.volumeMounts) {
          container.volumeMounts = [{
            name: 'data',
            mountPath: '/data'
          }];
        }
        
        return obj;
      };
      
      yamlObj = validateYamlObject(yamlObj);
      console.log('验证后的YAML对象:', yamlObj);
      
      // 设置更新策略
      if (values.updateStrategy) {
        yamlObj.spec.strategy = yamlObj.spec.strategy || {};
        yamlObj.spec.strategy.type = values.updateStrategy;
        
        if (values.updateStrategy === 'RollingUpdate') {
          yamlObj.spec.strategy.rollingUpdate = yamlObj.spec.strategy.rollingUpdate || {};
          yamlObj.spec.strategy.rollingUpdate.maxSurge = values.maxSurge;
          yamlObj.spec.strategy.rollingUpdate.maxUnavailable = values.maxUnavailable;
        }
      }
      
      // 设置节点选择器
      if (values.nodeSelector) {
        const nodeSelectorObj: Record<string, string> = {};
        const pairs = typeof values.nodeSelector === 'string' ? values.nodeSelector.split(',') : [];
        
        pairs.forEach((pair: string) => {
          const [key, value] = pair.split('=').map((item: string) => item.trim());
          if (key && value) {
            nodeSelectorObj[key] = value;
          }
        });
        
        if (Object.keys(nodeSelectorObj).length > 0) {
          yamlObj.spec.template.spec.nodeSelector = nodeSelectorObj;
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
        const pairs = typeof values.tolerations === 'string' ? values.tolerations.split(',') : [];
        
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
          yamlObj.spec.template.spec.tolerations = tolerationsArray;
        }
      }
      
      console.log('生成的YAML对象:', yamlObj);
      return yamlObj;
    } catch (error) {
      console.error('生成YAML失败:', error);
      return null;
    }
  };

  return (
    <BaseForm
      onOk={onOk}
      onCancel={onCancel}
      templateType="Deployment"
      defaultValues={defaultValues}
      generateYaml={generateYaml}
      showReplicas={true}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Form.Item 
          name="updateStrategy" 
          label={i18nInstance.t('更新策略', '更新策略')}
        >
          <Radio.Group>
            <Radio value="RollingUpdate">滚动更新 (RollingUpdate)</Radio>
            <Radio value="Recreate">重建 (Recreate)</Radio>
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
                <Space>
                  <Form.Item 
                    name="maxSurge" 
                    label={i18nInstance.t('最大超出数量', '最大超出数量')}
                    tooltip="最大超出副本数量，可以是百分比或整数"
                  >
                    <Input placeholder="例如: 25%" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="maxUnavailable" 
                    label={i18nInstance.t('最大不可用数量', '最大不可用数量')}
                    tooltip="最大不可用副本数量，可以是百分比或整数"
                  >
                    <Input placeholder="例如: 25%" />
                  </Form.Item>
                </Space>
              );
            }
            return null;
          }}
        </Form.Item>
      </Space>
    </BaseForm>
  );
};

export default DeploymentForm;
