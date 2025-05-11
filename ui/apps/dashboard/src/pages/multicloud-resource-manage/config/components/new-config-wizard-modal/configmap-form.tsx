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
import { Form, Input, Button, Card, Space, Empty } from 'antd';
import { FC, useState } from 'react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { KeyValuePair } from '../../../types';

interface ConfigMapFormProps {
  form: any;
}

const ConfigMapForm: FC<ConfigMapFormProps> = ({ form }) => {
  const [configData, setConfigData] = useState<KeyValuePair[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // 添加配置数据
  const handleAddData = () => {
    if (!newKey.trim()) {
      return;
    }

    const newData = [...configData, { key: newKey, value: newValue }];
    setConfigData(newData);
    
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
    const newData = [...configData];
    newData.splice(index, 1);
    setConfigData(newData);
    
    // 更新表单数据
    const formattedData: Record<string, string> = {};
    newData.forEach(item => {
      formattedData[item.key] = item.value;
    });
    form.setFieldsValue({ data: formattedData });
  };

  // 更新配置数据
  const handleUpdateData = (index: number, key: string, value: string) => {
    const newData = [...configData];
    newData[index] = { key, value };
    setConfigData(newData);
    
    // 更新表单数据
    const formattedData: Record<string, string> = {};
    newData.forEach(item => {
      formattedData[item.key] = item.value;
    });
    form.setFieldsValue({ data: formattedData });
  };

  return (
    <div className="configmap-form">
      <Form.Item
        label={i18nInstance.t('配置数据', '配置数据')}
        name="data"
        initialValue={{}}
        required
      >
        <div>
          {configData.length === 0 ? (
            <Empty 
              description={i18nInstance.t('暂无数据', '暂无数据')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            configData.map((item, index) => (
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
                <Input.TextArea
                  value={item.value}
                  placeholder={i18nInstance.t('值', '值')}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  onChange={(e) => handleUpdateData(index, item.key, e.target.value)}
                />
              </Card>
            ))
          )}

          <div className="add-data-form mt-4">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder={i18nInstance.t('配置键名', '配置键名')}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <Input.TextArea
                placeholder={i18nInstance.t('配置值', '配置值')}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
              <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={handleAddData}
                block
              >
                {i18nInstance.t('添加配置数据', '添加配置数据')}
              </Button>
            </Space>
          </div>
        </div>
      </Form.Item>
    </div>
  );
};

export default ConfigMapForm; 