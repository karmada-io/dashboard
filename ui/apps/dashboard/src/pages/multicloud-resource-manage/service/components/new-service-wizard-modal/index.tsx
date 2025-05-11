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
import { Modal, message } from 'antd';
import ServiceForm from './service';
import IngressForm from './ingress';
import { IResponse } from '@/services/base.ts';

interface NewServiceWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  serviceType?: string; // 服务类型
}

/**
 * 新建服务向导模态框
 */
const NewServiceWizardModal: FC<NewServiceWizardModalProps> = (props) => {
  const { visible, onClose, onSuccess, serviceType = 'Service' } = props;

  // 处理成功结果
  const handleSuccess = async (ret: IResponse<any>) => {
    if (ret.code === 200) {
      message.success(i18nInstance.t('创建成功', '创建成功'));
      onClose();
      onSuccess && onSuccess();
    } else {
      message.error(ret.msg || i18nInstance.t('创建失败', '创建失败'));
    }
  };

  // 根据服务类型渲染对应的表单
  const renderForm = () => {
    if (serviceType.toLowerCase() === 'ingress') {
      return <IngressForm onOk={handleSuccess} onCancel={onClose} />;
    }
    return <ServiceForm onOk={handleSuccess} onCancel={onClose} />;
  };

  return (
    <Modal
      title={i18nInstance.t(
        serviceType.toLowerCase() === 'ingress' ? '新建Ingress' : '新建服务',
        serviceType.toLowerCase() === 'ingress' ? '新建Ingress' : '新建服务'
      )}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      {renderForm()}
    </Modal>
  );
};

export default NewServiceWizardModal; 