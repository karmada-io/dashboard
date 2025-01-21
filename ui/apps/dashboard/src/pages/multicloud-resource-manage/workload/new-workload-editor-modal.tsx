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
import { Form, Modal, Select } from 'antd';
import Editor from '@monaco-editor/react';
import { parse } from 'yaml';
import _ from 'lodash';
import { CreateResource, PutResource } from '@/services/unstructured';
import { IResponse, WorkloadKind } from '@/services/base.ts';
export interface NewWorkloadEditorModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  kind: WorkloadKind;
  workloadContent?: string;
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

const NewWorkloadEditorModal: FC<NewWorkloadEditorModalProps> = (props) => {
  const { mode, open, workloadContent = '', onOk, onCancel, kind } = props;
  const [content, setContent] = useState<string>(workloadContent);
  useEffect(() => {
    setContent(workloadContent);
  }, [workloadContent]);

  function handleEditorChange(value: string | undefined) {
    setContent(value || '');
  }
  return (
    <Modal
      title={
        mode === 'create'
          ? i18nInstance.t('96d6b0fcc58b6f65dc4c00c6138d2ac0', '新增工作负载')
          : i18nInstance.t('634a943c97e905149acb81cef5bda28e', '编辑工作负载')
      }
      open={open}
      width={1000}
      okText={i18nInstance.t('38cf16f2204ffab8a6e0187070558721', '确定')}
      cancelText={i18nInstance.t('625fb26b4b3340f7872b411f401e754c', '取消')}
      destroyOnClose={true}
      onOk={async () => {
        // await onOk()
        try {
          const yamlObject = parse(content) as Record<string, string>;
          const kind = _.get(yamlObject, 'kind');
          const namespace = _.get(yamlObject, 'metadata.namespace');
          const name = _.get(yamlObject, 'metadata.name');
          if (mode === 'create') {
            const ret = await CreateResource({
              kind,
              name,
              namespace,
              content: yamlObject,
            });
            console.log('ret', ret);
            await onOk(ret);
            setContent('');
          } else {
            const ret = await PutResource({
              kind,
              name,
              namespace,
              content: yamlObject,
            });
            await onOk(ret);
            setContent('');
          }
        } catch (e) {
          console.log('e', e);
        }
      }}
      onCancel={async () => {
        await onCancel();
        setContent('');
      }}
    >
      <Form.Item
        label={i18nInstance.t(
          '0a3e7cdadc44fb133265152268761abc',
          '工作负载类型',
        )}
      >
        <Select
          value={kind}
          disabled
          options={[
            {
              label: 'Deployment',
              value: WorkloadKind.Deployment,
            },
            {
              label: 'Statefulset',
              value: WorkloadKind.Statefulset,
            },
            {
              label: 'Daemonset',
              value: WorkloadKind.Daemonset,
            },
            {
              label: 'Cronjob',
              value: WorkloadKind.Cronjob,
            },
            {
              label: 'Job',
              value: WorkloadKind.Job,
            },
          ]}
          style={{
            width: 200,
          }}
        />
      </Form.Item>
      <Editor
        height="600px"
        defaultLanguage="yaml"
        value={content}
        theme="vs"
        options={{
          theme: 'vs',
          lineNumbers: 'on',
          fontSize: 15,
          minimap: {
            enabled: false,
          },
          wordWrap: 'on',
        }}
        onChange={handleEditorChange}
      />
    </Modal>
  );
};
export default NewWorkloadEditorModal;
