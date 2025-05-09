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
import { FC, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Drawer, Space, Select } from 'antd';
import { CreatePropagationPolicy } from '@/services/propagationpolicy.ts';
import { PutResource } from '@/services/unstructured';
import { IResponse } from '@/services/base.ts';
import { parse } from 'yaml';
import _ from 'lodash';
import { schedulingPolicyTemplates } from './schedulingPolicyTemplates';

export interface PropagationPolicyEditorDrawerProps {
  open: boolean;
  mode: 'create' | 'edit' | 'detail';
  name?: string;
  namespace?: string;
  propagationContent?: string;
  onClose: () => void;
  onUpdate: (ret: IResponse<string>) => void;
  onCreate: (ret: IResponse<string>) => void;
}

function getTitle(
  mode: PropagationPolicyEditorDrawerProps['mode'],
  name: string = '',
) {
  switch (mode) {
    case 'create':
      return i18nInstance.t('5ac6560da4f54522d590c5f8e939691b', '新增调度策略');
    case 'edit':
      return i18nInstance.t('0518f7eb54d49436d72ae539f422e68b', { name });
    case 'detail':
      return `${name}${i18nInstance.t('f05bc327e4066ca97af893e52e2c62b3', '策略详情')}`;
    default:
      return '';
  }
}

// 以下变量未使用，注释掉
/* const workloadKindDescriptions: Record<string, string> = {
  Deployment: '管理无状态应用的控制器',
  StatefulSet: '管理有状态应用的控制器',
  DaemonSet: '确保所有节点运行Pod副本的控制器',
  Job: '运行一次性任务的控制器',
  CronJob: '基于时间调度的任务控制器',
};*/

const PropagationPolicyEditorDrawer: FC<PropagationPolicyEditorDrawerProps> = (
  props,
) => {
  const {
    open,
    mode,
    name,
    namespace,
    propagationContent,
    onClose,
    onCreate,
    onUpdate,
  } = props;
  const [content, setContent] = useState<string>(propagationContent || '');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    setContent(propagationContent || '');
    if (mode === 'create' && !propagationContent) {
      const template = schedulingPolicyTemplates[0];
      setContent(template.yaml);
      setSelectedTemplate(template.type);
    }
  }, [propagationContent, mode]);

  function handleEditorChange(value: string | undefined) {
    setContent(value || '');
  }

  return (
    <Drawer
      open={open}
      title={getTitle(mode, name)}
      width={800}
      styles={{
        body: {
          padding: 0,
        },
      }}
      closeIcon={false}
      onClose={onClose}
      footer={
        <div className={'flex flex-row justify-end'}>
          <Space>
            <Button onClick={onClose}>
              {i18nInstance.t('625fb26b4b3340f7872b411f401e754c', '取消')}
            </Button>
            <Button
              type="primary"
              onClick={async () => {
                const yamlObject = parse(content) as Record<string, string>;
                if (mode === 'edit') {
                  const updateRet = await PutResource({
                    kind: 'propagationpolicy',
                    name: name || '',
                    namespace: namespace || '',
                    content: yamlObject,
                  });
                  onUpdate(updateRet as IResponse<string>);
                } else {
                  const name = _.get(yamlObject, 'metadata.name');
                  const namespace = _.get(yamlObject, 'metadata.namespace');
                  const createRet = await CreatePropagationPolicy({
                    isClusterScope: false,
                    name: name || '',
                    namespace: namespace || '',
                    propagationData: content,
                  });
                  onCreate(createRet);
                }
              }}
            >
              {i18nInstance.t('38cf16f2204ffab8a6e0187070558721', '确定')}
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: 12, fontWeight: 500, fontSize: 16 }}>模板选择：</span>
          <Select
            value={selectedTemplate}
            style={{ width: 600, maxWidth: '100%' }}
            onChange={value => {
              setSelectedTemplate(value);
              const template = schedulingPolicyTemplates.find(t => t.type === value);
              if (template) setContent(template.yaml);
            }}
            options={schedulingPolicyTemplates.map(t => ({
              label: (
                <span style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>
                  {t.label}
                </span>
              ),
              value: t.type,
            }))}
            placeholder="请选择调度策略模板"
            dropdownStyle={{ fontSize: 15, minWidth: 600 }}
          />
        </div>
        <Editor
          height="600px"
          defaultLanguage="yaml"
          value={content}
          theme="vs"
          options={{
            theme: 'vs',
            lineNumbers: 'on',
            fontSize: 15,
            readOnly: mode === 'detail',
            minimap: { enabled: false },
            wordWrap: 'on',
          }}
          onChange={handleEditorChange}
        />
        <div style={{ marginBottom: 16, fontSize: 15, color: '#555' }}>
          {/* 这里原本使用了未定义的filter变量，暂时注释掉 */}
        </div>
      </div>
    </Drawer>
  );
};

export default PropagationPolicyEditorDrawer;
