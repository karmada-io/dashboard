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
import { Modal, Form, Button, message, Steps } from 'antd';
import { ConfigKind, IResponse } from '@/services/base.ts';
import { CreateResource } from '@/services/unstructured';
import BaseForm from './base-form';
import ConfigMapForm from './configmap-form';
import SecretForm from './secret-form';
import { useState } from 'react';

interface NewConfigWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  configType: ConfigKind;
}

/**
 * 新建配置向导模态框
 */
const NewConfigWizardModal: FC<NewConfigWizardModalProps> = (props) => {
  const { visible, onClose, onSuccess, configType } = props;
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      
      // 构建配置对象
      let configObject: any = {
        apiVersion: 'v1',
        kind: configType === ConfigKind.ConfigMap ? 'ConfigMap' : 'Secret',
        metadata: {
          name: values.name,
          namespace: values.namespace,
        },
        data: values.data || {}
      };
      
      // Secret特殊处理
      if (configType === ConfigKind.Secret) {
        configObject.type = values.type || 'Opaque';
        
        // Base64编码数据
        const encodedData: Record<string, string> = {};
        Object.entries(values.data || {}).forEach(([key, value]) => {
          encodedData[key] = btoa(String(value));
        });
        configObject.data = encodedData;
      }
      
      // 添加标签
      if (values.labels && Object.keys(values.labels).length > 0) {
        configObject.metadata.labels = values.labels;
      }
      
      // 创建资源
      const ret = await CreateResource({
        kind: configObject.kind,
        name: configObject.metadata.name,
        namespace: configObject.metadata.namespace,
        content: configObject,
      });
      
      // 处理响应
      if (ret.code === 200) {
        message.success(i18nInstance.t('创建成功', '创建成功'));
        onClose();
        onSuccess && onSuccess();
      } else {
        message.error(ret.msg || i18nInstance.t('创建失败', '创建失败'));
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取当前步骤的表单内容
  const getStepContent = () => {
    switch (currentStep) {
      case 0:
        return <BaseForm form={form} />;
      case 1:
        return configType === ConfigKind.ConfigMap 
          ? <ConfigMapForm form={form} /> 
          : <SecretForm form={form} />;
      default:
        return null;
    }
  };

  // 步骤设置
  const steps = [
    {
      title: i18nInstance.t('基本信息', '基本信息'),
      content: <BaseForm form={form} />,
    },
    {
      title: i18nInstance.t(
        configType === ConfigKind.ConfigMap ? '配置数据' : '敏感数据',
        configType === ConfigKind.ConfigMap ? '配置数据' : '敏感数据'
      ),
      content: configType === ConfigKind.ConfigMap 
        ? <ConfigMapForm form={form} /> 
        : <SecretForm form={form} />,
    }
  ];

  return (
    <Modal
      title={i18nInstance.t(
        configType === ConfigKind.ConfigMap ? '新建配置' : '新建密钥',
        configType === ConfigKind.ConfigMap ? '新建配置' : '新建密钥'
      )}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Steps
        current={currentStep}
        items={steps.map(item => ({ title: item.title }))}
        className="mb-6 mt-4"
      />
      
      <div className="step-content">
        {getStepContent()}
      </div>
      
      <div className="step-action mt-6 flex justify-between">
        {currentStep > 0 && (
          <Button onClick={() => setCurrentStep(currentStep - 1)}>
            {i18nInstance.t('上一步', '上一步')}
          </Button>
        )}
        
        <div className="flex-grow"></div>
        
        <Button onClick={onClose}>
          {i18nInstance.t('取消', '取消')}
        </Button>
        
        {currentStep < steps.length - 1 ? (
          <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)} className="ml-2">
            {i18nInstance.t('下一步', '下一步')}
          </Button>
        ) : (
          <Button 
            type="primary" 
            onClick={handleSubmit}
            loading={isSubmitting}
            className="ml-2"
          >
            {i18nInstance.t('创建', '创建')}
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default NewConfigWizardModal; 