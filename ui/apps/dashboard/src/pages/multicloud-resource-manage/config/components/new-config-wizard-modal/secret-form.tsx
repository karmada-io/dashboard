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
import { Form, Input, Button, Card, Space, Empty, Select } from 'antd';
import { FC, useState } from 'react';
import { MinusCircleOutlined, PlusOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { KeyValuePair } from '../../../types';

interface SecretFormProps {
  form: any;
}

const SecretForm: FC<SecretFormProps> = ({ form }) => {
  const [secretData, setSecretData] = useState<KeyValuePair[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // 添加配置数据
  const handleAddData = () => {
    if (!newKey.trim()) {
      return;
    }

    const newData = [...secretData, { key: newKey, value: newValue }];
    setSecretData(newData);
    
    // 更新表单数据
    const formattedData: Record<string, string> = {};
    newData.forEach(item => {
      formattedData[item.key] = item.value;
    });
    form.setFieldsValue({ data: formattedData });
    
    // 清空输入
    setNewKey('');
    setNewValue('');
  };

  // 删除配置数据
  const handleRemoveData = (index: number) => {
    const newData = [...secretData];
    newData.splice(index, 1);
    setSecretData(newData);
    
    // 更新表单数据
    const formattedData: Record<string, string> = {};
    newData.forEach(item => {
      formattedData[item.key] = item.value;
    });
    form.setFieldsValue({ data: formattedData });
  };

  // 更新配置数据
  const handleUpdateData = (index: number, key: string, value: string) => {
    const newData = [...secretData];
    newData[index] = { key, value };
    setSecretData(newData);
    
    // 更新表单数据
    const formattedData: Record<string, string> = {};
    newData.forEach(item => {
      formattedData[item.key] = item.value;
    });
    form.setFieldsValue({ data: formattedData });
  };

  return (
    <div className="secret-form">
      <Form.Item
        label={i18nInstance.t('Secret类型', 'Secret类型')}
        name="type"
        initialValue="Opaque"
        rules={[{ required: true, message: i18nInstance.t('请选择Secret类型', '请选择Secret类型') }]}
      >
        <Select
          options={[
            { label: 'Opaque (通用Secret)', value: 'Opaque' },
            { label: 'kubernetes.io/tls (TLS证书)', value: 'kubernetes.io/tls' },
            { label: 'kubernetes.io/dockerconfigjson (Docker配置)', value: 'kubernetes.io/dockerconfigjson' },
            { label: 'kubernetes.io/service-account-token (服务账户令牌)', value: 'kubernetes.io/service-account-token' },
            { label: 'kubernetes.io/basic-auth (基本认证)', value: 'kubernetes.io/basic-auth' },
          ]}
        />
      </Form.Item>

      <Form.Item
        label={i18nInstance.t('敏感数据', '敏感数据')}
        name="data"
        initialValue={{}}
        required
      >
        <div>
          {secretData.length === 0 ? (
            <Empty 
              description={i18nInstance.t('暂无数据', '暂无数据')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            secretData.map((item, index) => (
              <Card 
                key={index}
                size="small" 
                className="mb-3"
                title={
                  <Input
                    value={item.key}
                    placeholder={i18nInstance.t('键', '键')}
                    onChange={(e) => handleUpdateData(index, e.target.value, item.value)}
                  />
                }
                extra={
                  <Button 
                    type="text" 
                    danger 
                    icon={<MinusCircleOutlined />}
                    onClick={() => handleRemoveData(index)}
                  />
                }
              >
                <Input.Password
                  value={item.value}
                  placeholder={i18nInstance.t('值', '值')}
                  onChange={(e) => handleUpdateData(index, item.key, e.target.value)}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Card>
            ))
          )}

          <div className="add-data-form mt-4">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder={i18nInstance.t('键名', '键名')}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <Input.Password
                placeholder={i18nInstance.t('敏感值', '敏感值')}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
              <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={handleAddData}
                block
              >
                {i18nInstance.t('添加敏感数据', '添加敏感数据')}
              </Button>
            </Space>
          </div>
        </div>
      </Form.Item>
    </div>
  );
};

export default SecretForm; 