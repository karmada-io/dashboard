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
import { IResponse } from '@/services/base';
import BaseForm from './base-form';
import { Form, InputNumber, Switch } from 'antd';
import { parse } from 'yaml';

export interface NamespaceScopedFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

/**
 * 命名空间级调度策略表单
 */
const NamespaceScopedForm: FC<NamespaceScopedFormProps> = (props) => {
  const { onOk, onCancel } = props;

  // 默认值
  const defaultValues = {
    name: '',
    namespace: 'default',
    resourceKind: 'Service',
    resourceApiVersion: 'v1',
    resourceName: '',
    clusterNames: [],
    replicaSchedulingType: 'Duplicated',
    divisionPreference: 'Weighted',
    enableSpreadConstraints: false,
    minGroups: 1,
    maxGroups: 3,
    minReplicas: 1,
    maxReplicas: 10
  };

  // 生成YAML对象
  const generateYaml = (values: any, template: any) => {
    try {
      console.log('命名空间策略表单生成YAML，输入值:', values);
      let yamlObj = parse(template.yaml);
      
      // 设置基础信息
      yamlObj.metadata = yamlObj.metadata || {};
      yamlObj.metadata.name = values.name || '';
      yamlObj.metadata.namespace = values.namespace || 'default';
      
      // 设置资源选择器
      yamlObj.spec = yamlObj.spec || {};
      yamlObj.spec.resourceSelectors = yamlObj.spec.resourceSelectors || [{}];
      
      const resourceSelector = {
        apiVersion: values.resourceApiVersion || 'v1',
        kind: values.resourceKind || 'Service'
      };
      
      if (values.resourceName) {
        resourceSelector.name = values.resourceName;
      }
      
      yamlObj.spec.resourceSelectors[0] = resourceSelector;
      
      // 设置集群亲和性
      yamlObj.spec.placement = yamlObj.spec.placement || {};
      yamlObj.spec.placement.clusterAffinity = {
        clusterNames: values.clusterNames || []
      };
      
      // 设置副本调度策略
      yamlObj.spec.placement.replicaScheduling = {
        replicaSchedulingType: values.replicaSchedulingType || 'Duplicated'
      };
      
      // 如果是Divided类型，设置分配偏好
      if (values.replicaSchedulingType === 'Divided') {
        yamlObj.spec.placement.replicaScheduling.replicaDivisionPreference = values.divisionPreference || 'Weighted';
        
        // 如果是按权重分配，设置静态权重列表
        if (values.divisionPreference === 'Weighted' && values.clusterWeights) {
          const staticWeightList = Object.entries(values.clusterWeights).map(([cluster, weight]) => ({
            targetCluster: {
              clusterNames: [cluster]
            },
            weight: Number(weight) || 1
          }));
          
          yamlObj.spec.placement.replicaScheduling.weightPreference = {
            staticWeightList: staticWeightList
          };
        }
      }
      
      // 设置分布约束
      if (values.enableSpreadConstraints) {
        yamlObj.spec.placement.spreadConstraints = [
          {
            spreadByField: 'cluster',
            minGroups: values.minGroups || 1,
            maxGroups: values.maxGroups || 3,
            minReplicas: values.minReplicas || 1,
            maxReplicas: values.maxReplicas || 10
          }
        ];
      } else {
        delete yamlObj.spec.placement.spreadConstraints;
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
      templateType="NamespaceScoped"
      defaultValues={defaultValues}
      generateYaml={generateYaml}
      isClusterScoped={false}
    >
      {/* 高级设置 */}
      <Form.Item 
        name="enableSpreadConstraints" 
        label={i18nInstance.t('启用分布约束', '启用分布约束')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => 
          prevValues.enableSpreadConstraints !== currentValues.enableSpreadConstraints
        }
      >
        {({ getFieldValue }) => {
          const enableSpreadConstraints = getFieldValue('enableSpreadConstraints');
          
          if (enableSpreadConstraints) {
            return (
              <div style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 8 }}>分布约束配置</div>
                
                <Form.Item 
                  name="minGroups" 
                  label={i18nInstance.t('最小组数', '最小组数')}
                  tooltip="最少需要多少个集群组分布副本"
                >
                  <InputNumber min={1} style={{ width: 120 }} />
                </Form.Item>
                
                <Form.Item 
                  name="maxGroups" 
                  label={i18nInstance.t('最大组数', '最大组数')}
                  tooltip="最多允许多少个集群组分布副本"
                >
                  <InputNumber min={1} style={{ width: 120 }} />
                </Form.Item>
                
                <Form.Item 
                  name="minReplicas" 
                  label={i18nInstance.t('最小副本数', '最小副本数')}
                  tooltip="每个集群组中最少需要分配的副本数"
                >
                  <InputNumber min={1} style={{ width: 120 }} />
                </Form.Item>
                
                <Form.Item 
                  name="maxReplicas" 
                  label={i18nInstance.t('最大副本数', '最大副本数')}
                  tooltip="每个集群组中最多允许分配的副本数"
                >
                  <InputNumber min={1} style={{ width: 120 }} />
                </Form.Item>
              </div>
            );
          }
          
          return null;
        }}
      </Form.Item>
    </BaseForm>
  );
};

export default NamespaceScopedForm; 