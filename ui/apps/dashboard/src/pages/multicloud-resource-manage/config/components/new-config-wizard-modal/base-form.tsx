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
import { Form, Input, Select, Space, Button, Tag } from 'antd';
import { FC, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { KeyValuePair } from '../../../types';
import useNamespace from '@/hooks/use-namespace';

interface BaseFormProps {
  form: any;
}

const BaseForm: FC<BaseFormProps> = ({ form }) => {
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputKey, setInputKey] = useState('');
  
  // 处理标签添加
  const handleAddLabel = () => {
    if (inputKey && inputValue) {
      const currentLabels = form.getFieldValue('labels') || {};
      form.setFieldsValue({
        labels: {
          ...currentLabels,
          [inputKey]: inputValue
        }
      });
      setInputVisible(false);
      setInputKey('');
      setInputValue('');
    }
  };

  // 处理标签删除
  const handleRemoveLabel = (key: string) => {
    const currentLabels = form.getFieldValue('labels') || {};
    const newLabels = { ...currentLabels };
    delete newLabels[key];
    form.setFieldsValue({ labels: newLabels });
  };

  return (
    <div className="config-base-form">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: '',
          namespace: '',
          labels: {},
          annotations: {}
        }}
      >
        <Form.Item
          label={i18nInstance.t('名称', '名称')}
          name="name"
          rules={[{ required: true, message: i18nInstance.t('请输入配置名称', '请输入配置名称') }]}
        >
          <Input placeholder={i18nInstance.t('请输入配置名称', '请输入配置名称')} />
        </Form.Item>

        <Form.Item
          label={i18nInstance.t('命名空间', '命名空间')}
          name="namespace"
          rules={[{ required: true, message: i18nInstance.t('请选择命名空间', '请选择命名空间') }]}
        >
          <Select
            showSearch
            placeholder={i18nInstance.t('请选择命名空间', '请选择命名空间')}
            options={nsOptions}
            loading={isNsDataLoading}
            filterOption={(input, option) =>
              (option?.title?.toLowerCase() ?? '').includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          label={i18nInstance.t('标签', '标签')}
          name="labels"
        >
          <div className="labels-container">
            {Object.entries(form.getFieldValue('labels') || {}).map(([key, value]) => (
              <Tag
                key={key}
                closable
                onClose={() => handleRemoveLabel(key)}
                className="mb-2 mr-2"
              >
                {key}: {value}
              </Tag>
            ))}

            {inputVisible ? (
              <Space className="mt-2">
                <Input
                  placeholder={i18nInstance.t('键', '键')}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  style={{ width: 120 }}
                />
                <Input
                  placeholder={i18nInstance.t('值', '值')}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  style={{ width: 120 }}
                />
                <Button size="small" type="primary" onClick={handleAddLabel}>
                  {i18nInstance.t('添加', '添加')}
                </Button>
                <Button size="small" onClick={() => setInputVisible(false)}>
                  {i18nInstance.t('取消', '取消')}
                </Button>
              </Space>
            ) : (
              <Button
                type="dashed"
                onClick={() => setInputVisible(true)}
                icon={<PlusOutlined />}
                className="mt-2"
              >
                {i18nInstance.t('添加标签', '添加标签')}
              </Button>
            )}
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default BaseForm; 