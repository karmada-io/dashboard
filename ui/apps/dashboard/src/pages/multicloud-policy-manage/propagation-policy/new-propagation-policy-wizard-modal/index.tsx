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
import { Modal, message } from 'antd';
import { IResponse, PolicyScope } from '@/services/base';
import NamespaceScopedForm from './namespace-scoped-form';
import ClusterScopedForm from './cluster-scoped-form';

export interface NewPropagationPolicyWizardModalProps {
  open: boolean;
  policyScope: PolicyScope;
  onCancel: () => Promise<void> | void;
  onCreate: (ret: IResponse<any>) => Promise<void>;
}

/**
 * 新建调度策略向导模态框
 * 根据不同调度策略类型显示对应的表单
 */
const NewPropagationPolicyWizardModal: FC<NewPropagationPolicyWizardModalProps> = (props) => {
  const { open, onCancel, onCreate, policyScope } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理表单确认
  const handleFormOk = async (ret: IResponse<any>) => {
    try {
      setIsSubmitting(true);
      console.log('向导创建调度策略结果:', ret);
      await onCreate(ret);
    } catch (error) {
      console.error('调度策略创建异常:', error);
      message.error('创建失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理表单取消
  const handleFormCancel = async () => {
    if (isSubmitting) return; // 如果正在提交，不允许取消
    await onCancel();
  };

  // 根据调度策略类型渲染不同的表单组件
  const renderForm = () => {
    if (policyScope === PolicyScope.Namespace) {
      return <NamespaceScopedForm onOk={handleFormOk} onCancel={handleFormCancel} />;
    } else {
      return <ClusterScopedForm onOk={handleFormOk} onCancel={handleFormCancel} />;
    }
  };

  return (
    <Modal
      title={policyScope === PolicyScope.Namespace 
        ? i18nInstance.t('快速创建命名空间级调度策略', '快速创建命名空间级调度策略')
        : i18nInstance.t('快速创建集群级调度策略', '快速创建集群级调度策略')}
      open={open}
      width={750}
      footer={null} // 在各子组件中自行管理按钮
      destroyOnClose={true}
      onCancel={handleFormCancel}
      maskClosable={!isSubmitting} // 提交中不允许通过点击遮罩关闭
    >
      {renderForm()}
    </Modal>
  );
};

export default NewPropagationPolicyWizardModal; 