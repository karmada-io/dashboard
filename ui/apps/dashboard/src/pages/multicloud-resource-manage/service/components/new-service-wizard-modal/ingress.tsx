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
import { FC, useState } from 'react';
import { Button, Form, Input, Select, Space, Typography, Divider, Card } from 'antd';
import _ from 'lodash';
import { IResponse } from '@/services/base.ts';
import BaseForm from './base-form';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface IngressFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

/**
 * Ingress表单组件
 */
const IngressForm: FC<IngressFormProps> = (props) => {
  const { onOk, onCancel } = props;

  // 默认表单值
  const defaultValues = {
    name: '',
    namespace: 'default',
    labels: 'app=ingress',
    annotations: '',
    ingressClassName: '',
    rules: [
      {
        host: '',
        paths: [
          {
            path: '/',
            pathType: 'Prefix',
            serviceName: '',
            servicePort: 80
          }
        ]
      }
    ],
    tls: []
  };

  // 生成YAML对象
  const generateYaml = (values: any) => {
    const yamlObj: any = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: values.name,
        namespace: values.namespace
      },
      spec: {}
    };
    
    // 设置标签
    if (Object.keys(values.labels).length > 0) {
      yamlObj.metadata.labels = values.labels;
    }
    
    // 设置注释
    if (Object.keys(values.annotations).length > 0) {
      yamlObj.metadata.annotations = values.annotations;
    }
    
    // 设置Ingress类
    if (values.ingressClassName) {
      yamlObj.spec.ingressClassName = values.ingressClassName;
    }
    
    // 设置规则
    if (values.rules && values.rules.length > 0) {
      const rules = values.rules.map((rule: any) => {
        const ruleObj: any = {};
        
        if (rule.host) {
          ruleObj.host = rule.host;
        }
        
        if (rule.paths && rule.paths.length > 0) {
          ruleObj.http = {
            paths: rule.paths.map((path: any) => {
              return {
                path: path.path,
                pathType: path.pathType,
                backend: {
                  service: {
                    name: path.serviceName,
                    port: {
                      number: parseInt(path.servicePort)
                    }
                  }
                }
              };
            })
          };
        }
        
        return ruleObj;
      });
      
      yamlObj.spec.rules = rules;
    }
    
    // 设置TLS
    if (values.tls && values.tls.length > 0) {
      const tlsConfigs = values.tls
        .filter((tls: any) => tls.secretName && tls.hosts && tls.hosts.length > 0)
        .map((tls: any) => {
          return {
            secretName: tls.secretName,
            hosts: tls.hosts.split(',').map((host: string) => host.trim())
          };
        });
      
      if (tlsConfigs.length > 0) {
        yamlObj.spec.tls = tlsConfigs;
      }
    }
    
    return yamlObj;
  };

  // Ingress规则配置步骤
  const IngressConfigStep = (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div style={{ marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Ingress规则配置</h4>
        <Text type="secondary">配置HTTP路由规则</Text>
      </div>
      
      <Form.Item 
        name="ingressClassName" 
        label={i18nInstance.t('Ingress类', 'Ingress类')}
        tooltip="使用的Ingress控制器类名"
      >
        <Input placeholder="例如: nginx" />
      </Form.Item>
      
      <Divider orientation="left">路由规则</Divider>
      
      <Form.List name="rules">
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%' }}>
            {fields.map((field, index) => (
              <Card 
                key={field.key} 
                title={`规则 ${index + 1}`}
                size="small"
                extra={
                  fields.length > 1 ? (
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  ) : null
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'host']}
                    label={i18nInstance.t('主机名', '主机名')}
                    tooltip="Ingress规则应用的主机名，留空表示适用于所有主机"
                  >
                    <Input placeholder="例如: example.com" />
                  </Form.Item>
                  
                  <Divider orientation="left" plain>路径</Divider>
                  
                  <Form.List name={[field.name, 'paths']}>
                    {(pathFields, { add: addPath, remove: removePath }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {pathFields.map((pathField, pathIndex) => (
                          <Card 
                            key={pathField.key} 
                            size="small"
                            type="inner"
                            title={`路径 ${pathIndex + 1}`}
                            extra={
                              <MinusCircleOutlined onClick={() => removePath(pathField.name)} />
                            }
                          >
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Space>
                                <Form.Item
                                  {...pathField}
                                  name={[pathField.name, 'path']}
                                  label={i18nInstance.t('路径', '路径')}
                                  rules={[{ required: true, message: '请输入路径' }]}
                                  style={{ minWidth: 200, marginBottom: 0 }}
                                >
                                  <Input placeholder="例如: /api" />
                                </Form.Item>
                                
                                <Form.Item
                                  {...pathField}
                                  name={[pathField.name, 'pathType']}
                                  label={i18nInstance.t('路径类型', '路径类型')}
                                  rules={[{ required: true, message: '请选择路径类型' }]}
                                  style={{ minWidth: 160, marginBottom: 0 }}
                                >
                                  <Select
                                    options={[
                                      { label: 'Prefix', value: 'Prefix' },
                                      { label: 'Exact', value: 'Exact' },
                                      { label: 'ImplementationSpecific', value: 'ImplementationSpecific' },
                                    ]}
                                  />
                                </Form.Item>
                              </Space>
                              
                              <Space>
                                <Form.Item
                                  {...pathField}
                                  name={[pathField.name, 'serviceName']}
                                  label={i18nInstance.t('服务名称', '服务名称')}
                                  rules={[{ required: true, message: '请输入服务名称' }]}
                                  style={{ minWidth: 200, marginBottom: 0 }}
                                >
                                  <Input placeholder="例如: my-service" />
                                </Form.Item>
                                
                                <Form.Item
                                  {...pathField}
                                  name={[pathField.name, 'servicePort']}
                                  label={i18nInstance.t('服务端口', '服务端口')}
                                  rules={[{ required: true, message: '请输入服务端口' }]}
                                  style={{ minWidth: 160, marginBottom: 0 }}
                                >
                                  <Input placeholder="例如: 80" />
                                </Form.Item>
                              </Space>
                            </Space>
                          </Card>
                        ))}
                        
                        <Button 
                          type="dashed" 
                          onClick={() => addPath()} 
                          block 
                          icon={<PlusOutlined />}
                        >
                          添加路径
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </Space>
              </Card>
            ))}
            
            <Button 
              type="dashed" 
              onClick={() => add({ host: '', paths: [{ path: '/', pathType: 'Prefix', serviceName: '', servicePort: 80 }] })} 
              block 
              icon={<PlusOutlined />}
            >
              添加规则
            </Button>
          </Space>
        )}
      </Form.List>
    </Space>
  );

  return (
    <BaseForm
      onOk={onOk}
      onCancel={onCancel}
      serviceType="Ingress"
      defaultValues={defaultValues}
      generateYaml={generateYaml}
      ingressConfigStep={IngressConfigStep}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <h4 style={{ margin: '0 0 8px 0' }}>TLS配置</h4>
        
        <Form.List name="tls">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }}>
              {fields.map((field, index) => (
                <Card 
                  key={field.key} 
                  size="small"
                  title={`TLS配置 ${index + 1}`}
                  extra={
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'secretName']}
                      label={i18nInstance.t('Secret名称', 'Secret名称')}
                      rules={[{ required: true, message: '请输入Secret名称' }]}
                    >
                      <Input placeholder="例如: my-tls-secret" />
                    </Form.Item>
                    
                    <Form.Item
                      {...field}
                      name={[field.name, 'hosts']}
                      label={i18nInstance.t('主机名列表', '主机名列表')}
                      tooltip="以逗号分隔的主机名列表"
                      rules={[{ required: true, message: '请输入主机名列表' }]}
                    >
                      <Input placeholder="例如: example.com,www.example.com" />
                    </Form.Item>
                  </Space>
                </Card>
              ))}
              
              <Button 
                type="dashed" 
                onClick={() => add({ secretName: '', hosts: '' })} 
                block 
                icon={<PlusOutlined />}
              >
                添加TLS配置
              </Button>
            </Space>
          )}
        </Form.List>
      </Space>
    </BaseForm>
  );
};

export default IngressForm; 