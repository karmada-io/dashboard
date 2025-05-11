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
import { Divider, Form, Input, InputNumber, Radio, Select, Space, Typography, Checkbox } from 'antd';
import { parse } from 'yaml';
import _ from 'lodash';
import { IResponse } from '@/services/base.ts';
import BaseForm from './base-form';

const { Text } = Typography;

interface StatefulsetFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

/**
 * StatefulSet表单组件
 */
const StatefulsetForm: FC<StatefulsetFormProps> = (props) => {
  const { onOk, onCancel } = props;

  // 默认表单值
  const defaultValues = {
    name: '',
    namespace: 'default',
    serviceName: '',
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
    labels: 'app=nginx',
    hostNetwork: false,
    dnsPolicy: 'ClusterFirst',
    nodeSelector: '',
    tolerations: '',
    // 存储相关
    storageEnabled: true,
    storageType: 'dynamic', // dynamic 或 static
    storageClassName: '',    // 动态供应时使用的存储类
    storageSize: '1Gi',
    volumeMode: 'Filesystem', // Filesystem 或 Block
    accessModes: 'ReadWriteOnce', // ReadWriteOnce,ReadOnlyMany,ReadWriteMany
    mountPath: '/data',
    volumeName: 'data',
    updateStrategy: 'RollingUpdate',
    podManagementPolicy: 'OrderedReady',
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
    
    // 设置副本数
    _.set(yamlObj, 'spec.replicas', values.replicas);
    
    // 设置服务名称
    const serviceName = values.serviceName || `${values.name}-headless`;
    _.set(yamlObj, 'spec.serviceName', serviceName);
    
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
    
    // 设置更新策略和Pod管理策略
    _.set(yamlObj, 'spec.updateStrategy.type', values.updateStrategy);
    _.set(yamlObj, 'spec.podManagementPolicy', values.podManagementPolicy);
    
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
    
    // 设置存储相关配置
    if (values.storageEnabled) {
      // 设置卷挂载
      _.set(yamlObj, 'spec.template.spec.containers[0].volumeMounts[0].name', values.volumeName);
      _.set(yamlObj, 'spec.template.spec.containers[0].volumeMounts[0].mountPath', values.mountPath);

      // 使用 volumeClaimTemplates 创建 PVC
      const volumeClaimTemplate: {
        metadata: { name: string };
        spec: {
          accessModes: string[];
          volumeMode: string;
          resources: { requests: { storage: string } };
          storageClassName?: string;
        }
      } = {
        metadata: {
          name: values.volumeName,
        },
        spec: {
          accessModes: values.accessModes.split(','),
          volumeMode: values.volumeMode,
          resources: {
            requests: {
              storage: values.storageSize,
            },
          },
        },
      };
      
      // 如果是动态供应，设置 storageClassName
      if (values.storageType === 'dynamic' && values.storageClassName) {
        volumeClaimTemplate.spec.storageClassName = values.storageClassName;
      }
      
      // StatefulSet 使用 volumeClaimTemplates 创建持久卷
      _.set(yamlObj, 'spec.volumeClaimTemplates', [volumeClaimTemplate]);
    }
    
    return yamlObj;
  };

  return (
    <BaseForm
      onOk={onOk}
      onCancel={onCancel}
      templateType="Statefulset"
      defaultValues={defaultValues}
      generateYaml={generateYaml}
      showReplicas={true}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Form.Item 
          name="serviceName" 
          label={i18nInstance.t('服务名称', '服务名称')}
          tooltip="StatefulSet 的无头服务名称，如果不填，将使用 [工作负载名称]-headless"
        >
          <Input placeholder="例如: my-service" />
        </Form.Item>
        
        <div style={{ marginBottom: 8, marginTop: 8 }}>
          <h4 style={{ margin: 0 }}>更新和管理策略</h4>
        </div>
        
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
          name="podManagementPolicy" 
          label={i18nInstance.t('Pod管理策略', 'Pod管理策略')}
        >
          <Radio.Group>
            <Radio value="OrderedReady">
              有序就绪 (OrderedReady)
              <Text type="secondary" style={{ marginLeft: 8 }}>
                - 按顺序部署和扩展
              </Text>
            </Radio>
            <Radio value="Parallel">
              并行 (Parallel)
              <Text type="secondary" style={{ marginLeft: 8 }}>
                - 同时部署和扩展所有Pod
              </Text>
            </Radio>
          </Radio.Group>
        </Form.Item>

        <Divider orientation="left" plain style={{ margin: '8px 0' }}>
          <h4 style={{ margin: 0, display: 'inline' }}>存储配置</h4>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
            StatefulSet的主要特性是为每个Pod提供持久化存储
          </Text>
        </Divider>
        
        <Form.Item 
          name="storageEnabled" 
          valuePropName="checked"
          label={i18nInstance.t('启用存储', '启用存储')}
        >
          <Radio.Group>
            <Radio value={true}>启用</Radio>
            <Radio value={false}>禁用</Radio>
          </Radio.Group>
        </Form.Item>
        
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => 
            prevValues.storageEnabled !== currentValues.storageEnabled
          }
        >
          {({ getFieldValue }) => {
            const storageEnabled = getFieldValue('storageEnabled');
            if (storageEnabled) {
              return (
                <>
                  <Form.Item 
                    name="storageType" 
                    label={i18nInstance.t('存储类型', '存储类型')}
                    tooltip="选择动态供应使用StorageClass自动创建PV，静态供应需手动创建PV"
                  >
                    <Radio.Group>
                      <Radio value="dynamic">
                        动态供应 (Dynamic Provisioning)
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          - 使用StorageClass自动创建
                        </Text>
                      </Radio>
                      <Radio value="static">
                        静态供应 (Static Provisioning)
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          - 使用已创建的PV
                        </Text>
                      </Radio>
                    </Radio.Group>
                  </Form.Item>
                  
                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => 
                      prevValues.storageType !== currentValues.storageType
                    }
                  >
                    {({ getFieldValue }) => {
                      const storageType = getFieldValue('storageType');
                      if (storageType === 'dynamic') {
                        return (
                          <Form.Item 
                            name="storageClassName" 
                            label={i18nInstance.t('存储类名称', '存储类名称')}
                            tooltip="指定要使用的StorageClass，不填则使用默认StorageClass"
                          >
                            <Input placeholder="例如: standard" />
                          </Form.Item>
                        );
                      }
                      return null;
                    }}
                  </Form.Item>
                  
                  <Form.Item 
                    name="storageSize" 
                    label={i18nInstance.t('存储大小', '存储大小')}
                    rules={[{ required: true, message: '请输入存储大小' }]}
                  >
                    <Input placeholder="例如: 1Gi, 10Gi" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="accessModes" 
                    label={i18nInstance.t('访问模式', '访问模式')}
                    tooltip="ReadWriteOnce(RWO): 单节点读写, ReadOnlyMany(ROX): 多节点只读, ReadWriteMany(RWX): 多节点读写"
                  >
                    <Select
                      options={[
                        { label: 'ReadWriteOnce (RWO) - 单节点读写', value: 'ReadWriteOnce' },
                        { label: 'ReadOnlyMany (ROX) - 多节点只读', value: 'ReadOnlyMany' },
                        { label: 'ReadWriteMany (RWX) - 多节点读写', value: 'ReadWriteMany' },
                      ]}
                    />
                  </Form.Item>
                  
                  <Form.Item 
                    name="volumeMode" 
                    label={i18nInstance.t('卷模式', '卷模式')}
                    tooltip="Filesystem: 传统文件系统, Block: 原始块设备"
                  >
                    <Radio.Group>
                      <Radio value="Filesystem">文件系统 (Filesystem)</Radio>
                      <Radio value="Block">块设备 (Block)</Radio>
                    </Radio.Group>
                  </Form.Item>
                  
                  <Form.Item 
                    name="volumeName" 
                    label={i18nInstance.t('卷名称', '卷名称')}
                  >
                    <Input placeholder="例如: data" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="mountPath" 
                    label={i18nInstance.t('挂载路径', '挂载路径')}
                  >
                    <Input placeholder="例如: /data" />
                  </Form.Item>
                </>
              );
            }
            return null;
          }}
        </Form.Item>
      </Space>
    </BaseForm>
  );
};

export default StatefulsetForm;
