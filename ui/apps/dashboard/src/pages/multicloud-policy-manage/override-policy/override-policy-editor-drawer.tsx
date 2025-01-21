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

import { FC, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Drawer, Space } from 'antd';
import { PutResource } from '@/services/unstructured';
import { IResponse } from '@/services/base.ts';
import { parse } from 'yaml';
import _ from 'lodash';
import { CreateOverridePolicy } from '@/services/overridepolicy.ts';
import i18nInstance from '@/utils/i18n.tsx';
export interface OverridePolicyEditorDrawerProps {
  open: boolean;
  mode: 'create' | 'edit' | 'detail';
  name?: string;
  namespace?: string;
  isClusterScope?: boolean;
  overrideContent?: string;
  onClose: () => void;
  onUpdate: (ret: IResponse<string>) => void;
  onCreate: (ret: IResponse<string>) => void;
}
function getTitle(
  mode: OverridePolicyEditorDrawerProps['mode'],
  name: string = '',
) {
  switch (mode) {
    case 'create':
      return i18nInstance.t('7afddf70e5c82fab8fa935458b53174a', '新增覆盖策略');
    case 'edit':
      return i18nInstance.t('236513393327bd6b098056314f8676ac', '编辑覆盖策略');
    case 'detail':
      return i18nInstance.t('781a90424b3d02153bc979e0f90179aa', { name });
    default:
      return '';
  }
}
const OverridePolicyEditorDrawer: FC<OverridePolicyEditorDrawerProps> = (
  props,
) => {
  const {
    open,
    mode,
    name,
    namespace,
    isClusterScope = false,
    overrideContent,
    onClose,
    onCreate,
    onUpdate,
  } = props;
  const [content, setContent] = useState<string>(overrideContent || '');
  useEffect(() => {
    setContent(overrideContent || '');
  }, [overrideContent]);

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
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              onClick={async () => {
                const yamlObject = parse(content) as Record<string, string>;
                if (mode === 'edit') {
                  const updateRet = await PutResource({
                    kind: 'overridepolicy',
                    name: name || '',
                    namespace: namespace || '',
                    content: yamlObject,
                  });
                  onUpdate(updateRet as IResponse<string>);
                } else {
                  const name = _.get(yamlObject, 'metadata.name');
                  const namespace = _.get(yamlObject, 'metadata.namespace');
                  const createRet = await CreateOverridePolicy({
                    isClusterScope,
                    name: name || '',
                    namespace: namespace || '',
                    overrideData: content,
                  });
                  onCreate(createRet);
                }
              }}
            >
              确定
            </Button>
          </Space>
        </div>
      }
    >
      <Editor
        defaultLanguage="yaml"
        value={content}
        theme="vs"
        options={{
          theme: 'vs',
          lineNumbers: 'on',
          fontSize: 15,
          readOnly: mode === 'detail',
          minimap: {
            enabled: false,
          },
          wordWrap: 'on',
        }}
        onChange={handleEditorChange}
      />
    </Drawer>
  );
};
export default OverridePolicyEditorDrawer;
