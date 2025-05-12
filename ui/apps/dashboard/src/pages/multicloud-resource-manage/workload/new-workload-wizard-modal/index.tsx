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
import { IResponse, WorkloadKind } from '@/services/base.ts';
import DeploymentForm from './deployment';
import StatefulsetForm from './statefulset';
import DaemonsetForm from './daemonset';
import JobForm from './job';
import CronjobForm from './cronjob';

export interface NewWorkloadWizardModalProps {
  open: boolean;
  kind: WorkloadKind;
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

/**
 * 新建工作负载向导模态框
 * 根据不同工作负载类型显示对应的表单
 */
const NewWorkloadWizardModal: FC<NewWorkloadWizardModalProps> = (props) => {
  const { open, onOk, onCancel, kind } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理表单确认
  const handleFormOk = async (ret: IResponse<any>) => {
    try {
      setIsSubmitting(true);
      console.log('向导创建工作负载结果:', ret);
      await onOk(ret);
    } catch (error) {
      console.error('工作负载创建异常:', error);
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

  // 根据工作负载类型渲染不同的表单组件
  const renderForm = () => {
    switch (kind) {
      case WorkloadKind.Deployment:
        return <DeploymentForm onOk={handleFormOk} onCancel={handleFormCancel} />;
      case WorkloadKind.Statefulset:
        return <StatefulsetForm onOk={handleFormOk} onCancel={handleFormCancel} />;
      case WorkloadKind.Daemonset:
        return <DaemonsetForm onOk={handleFormOk} onCancel={handleFormCancel} />;
      case WorkloadKind.Job:
        return <JobForm onOk={handleFormOk} onCancel={handleFormCancel} />;
      case WorkloadKind.Cronjob:
        return <CronjobForm onOk={handleFormOk} onCancel={handleFormCancel} />;
      default:
        return <DeploymentForm onOk={handleFormOk} onCancel={handleFormCancel} />;
    }
  };

  return (
    <Modal
      title={i18nInstance.t('快速创建工作负载', '快速创建工作负载')}
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

export default NewWorkloadWizardModal; 