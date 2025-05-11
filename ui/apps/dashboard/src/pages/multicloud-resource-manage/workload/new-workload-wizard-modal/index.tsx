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
import { Modal } from 'antd';
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

  // 根据工作负载类型渲染不同的表单组件
  const renderForm = () => {
    switch (kind) {
      case WorkloadKind.Deployment:
        return <DeploymentForm onOk={onOk} onCancel={onCancel} />;
      case WorkloadKind.Statefulset:
        return <StatefulsetForm onOk={onOk} onCancel={onCancel} />;
      case WorkloadKind.Daemonset:
        return <DaemonsetForm onOk={onOk} onCancel={onCancel} />;
      case WorkloadKind.Job:
        return <JobForm onOk={onOk} onCancel={onCancel} />;
      case WorkloadKind.Cronjob:
        return <CronjobForm onOk={onOk} onCancel={onCancel} />;
      default:
        return <DeploymentForm onOk={onOk} onCancel={onCancel} />;
    }
  };

  return (
    <Modal
      title={i18nInstance.t('快速创建工作负载', '快速创建工作负载')}
      open={open}
      width={750}
      footer={null} // 在各子组件中自行管理按钮
      destroyOnClose={true}
      onCancel={onCancel}
    >
      {renderForm()}
    </Modal>
  );
};

export default NewWorkloadWizardModal; 