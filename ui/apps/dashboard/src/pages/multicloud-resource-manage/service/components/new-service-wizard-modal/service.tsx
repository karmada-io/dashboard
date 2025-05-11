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
import { Form, Input, Radio, Select, Space, Typography } from 'antd';
import _ from 'lodash';
import { IResponse } from '@/services/base.ts';
import BaseForm from './base-form';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ServiceFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

/**
 * 普通服务表单组件
 */
const ServiceForm: FC<ServiceFormProps> = (props) => {
  const { onOk, onCancel } = props;

  // 默认表单值
  const defaultValues = {
    name: '',
    namespace: 'default',
    serviceType: 'ClusterIP',
    labels: 'app=service',
    annotations: '',
    selectorType: 'matchLabels',
    selector: 'app=nginx',
    portName: 'http',
    protocol: 'TCP',
    port: 80,
    targetPort: 80,
    nodePort: '',
    externalTrafficPolicy: 'Cluster',
    sessionAffinity: 'None',
    sessionAffinityTimeout: 10800,
    externalName: '',
    loadBalancerIP: '',
  };

  // 生成YAML对象
  const generateYaml = (values: any) => {
    const yamlObj: any = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: values.name,
        namespace: values.namespace,
        labels: values.labels,
      },
      spec: {
        type: values.serviceType,
      },
    };

    // 设置注释
    if (Object.keys(values.annotations).length > 0) {
      _.set(yamlObj, 'metadata.annotations', values.annotations);
    }

    // 设置选择器
    if (values.selector) {
      const selectorObj = {};
      const pairs = values.selector.split(',');
      
      pairs.forEach((pair: string) => {
        const [key, value] = pair.split('=').map((item: string) => item.trim());
        if (key && value) {
          _.set(selectorObj, key, value);
        }
      });
      
      if (Object.keys(selectorObj).length > 0) {
        _.set(yamlObj, 'spec.selector', selectorObj);
      }
    }

    // ExternalName类型特殊处理
    if (values.serviceType === 'ExternalName') {
      _.set(yamlObj, 'spec.externalName', values.externalName);
      return yamlObj;
    }

    // 设置端口
    const ports = [];
    if (values.port) {
      const portObj: any = {
        port: parseInt(values.port),
        protocol: values.protocol,
      };

      if (values.portName) {
        portObj.name = values.portName;
      }

      if (values.targetPort) {
        portObj.targetPort = parseInt(values.targetPort);
      }

      if (values.serviceType === 'NodePort' && values.nodePort) {
        portObj.nodePort = parseInt(values.nodePort);
      }

      ports.push(portObj);
    }

    if (ports.length > 0) {
      _.set(yamlObj, 'spec.ports', ports);
    }

    // 设置会话亲和性
    if (values.sessionAffinity) {
      _.set(yamlObj, 'spec.sessionAffinity', values.sessionAffinity);
      
      if (values.sessionAffinity === 'ClientIP' && values.sessionAffinityTimeout) {
        _.set(yamlObj, 'spec.sessionAffinityConfig.clientIP.timeoutSeconds', parseInt(values.sessionAffinityTimeout));
      }
    }

    // 设置外部流量策略（NodePort和LoadBalancer类型适用）
    if (['NodePort', 'LoadBalancer'].includes(values.serviceType) && values.externalTrafficPolicy) {
      _.set(yamlObj, 'spec.externalTrafficPolicy', values.externalTrafficPolicy);
    }

    // 设置负载均衡器IP（LoadBalancer类型适用）
    if (values.serviceType === 'LoadBalancer' && values.loadBalancerIP) {
      _.set(yamlObj, 'spec.loadBalancerIP', values.loadBalancerIP);
    }

    return yamlObj;
  };

  // 服务选择器步骤
  const SelectorStep = (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div style={{ marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>选择器配置</h4>
        <Text type="secondary">选择要为哪些Pod创建服务</Text>
      </div>
      
      <Form.Item
        name="selector"
        label={i18nInstance.t('Pod选择器', 'Pod选择器')}
        tooltip="格式为 key=value，多个标签使用逗号分隔"
        rules={[{ required: true, message: '请输入Pod选择器' }]}
      >
        <Input.TextArea 
          placeholder="例如: app=nginx,tier=frontend" 
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Form.Item>
    </Space>
  );

  return (
    <BaseForm
      onOk={onOk}
      onCancel={onCancel}
      serviceType="Service"
      defaultValues={defaultValues}
      generateYaml={generateYaml}
      selectorStep={SelectorStep}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <h4 style={{ margin: '0 0 8px 0' }}>高级设置</h4>
        
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => 
            prevValues.serviceType !== currentValues.serviceType
          }
        >
          {({ getFieldValue }) => {
            const serviceType = getFieldValue('serviceType');
            
            return (
              <>
                {['NodePort', 'LoadBalancer'].includes(serviceType) && (
                  <Form.Item 
                    name="externalTrafficPolicy" 
                    label={i18nInstance.t('外部流量策略', '外部流量策略')}
                    tooltip="决定如何将外部流量路由到集群内节点"
                  >
                    <Radio.Group>
                      <Radio value="Cluster">
                        Cluster
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          - 可能会跨节点转发
                        </Text>
                      </Radio>
                      <Radio value="Local">
                        Local
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          - 保留客户端源IP，避免额外跳转
                        </Text>
                      </Radio>
                    </Radio.Group>
                  </Form.Item>
                )}
              </>
            );
          }}
        </Form.Item>
        
        <Form.Item 
          name="sessionAffinity" 
          label={i18nInstance.t('会话亲和性', '会话亲和性')}
          tooltip="会话亲和性可以让来自同一客户端的请求总是被发送到同一个Pod"
        >
          <Radio.Group>
            <Radio value="None">None (不保持会话)</Radio>
            <Radio value="ClientIP">ClientIP (基于客户端IP)</Radio>
          </Radio.Group>
        </Form.Item>
        
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => 
            prevValues.sessionAffinity !== currentValues.sessionAffinity
          }
        >
          {({ getFieldValue }) => {
            const sessionAffinity = getFieldValue('sessionAffinity');
            
            if (sessionAffinity === 'ClientIP') {
              return (
                <Form.Item 
                  name="sessionAffinityTimeout" 
                  label={i18nInstance.t('会话超时时间(秒)', '会话超时时间(秒)')}
                  tooltip="客户端会话保持的最长时间，默认值为10800秒（3小时）"
                >
                  <Input placeholder="默认: 10800" />
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

export default ServiceForm; 