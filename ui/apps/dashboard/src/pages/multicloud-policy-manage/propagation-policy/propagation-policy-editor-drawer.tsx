import i18nInstance from '@/utils/i18n';
import { FC, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Drawer, Space } from 'antd';
import { CreatePropagationPolicy } from '@/services/propagationpolicy.ts';
import { PutResource } from '@/services/unstructured';
import { IResponse } from '@/services/base.ts';
import { parse } from 'yaml';
import _ from 'lodash';
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
      return i18nInstance.t('5ac6560da4f54522d590c5f8e939691b');
    case 'edit':
      return `编辑${name}调度策略`;
    case 'detail':
      return `${name}策略详情`;
    default:
      return '';
  }
}

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
  useEffect(() => {
    setContent(propagationContent || '');
  }, [propagationContent]);

  function handleEditorChange(
    value: string | undefined,
  ) {
    setContent(value || '');
  }

  return (
    <Drawer
      open={open}
      title={getTitle(mode, name)}
      width={800}
      styles={{
        body: { padding: 0 },
      }}
      onClose={onClose}
      footer={
        <div className={'flex flex-row justify-end'}>
          <Space>
            <Button onClick={onClose}>
              {i18nInstance.t('625fb26b4b3340f7872b411f401e754c')}
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
              {i18nInstance.t('38cf16f2204ffab8a6e0187070558721')}
            </Button>
          </Space>
        </div>
      }
    >
      <Editor
        defaultLanguage="yaml"
        value={content}
        theme="vs-dark"
        // height={800}
        options={{
          theme: 'vs-dark',
          lineNumbers: 'on',
          readOnly: mode === 'detail',
          minimap: {
            enabled: false,
          },
        }}
        onChange={handleEditorChange}
      />
    </Drawer>
  );
};
export default PropagationPolicyEditorDrawer;
