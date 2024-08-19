import { FC, useEffect, useMemo, useState } from 'react';
import { Form, Modal, Select } from 'antd';
import Editor from '@monaco-editor/react';
import { parse } from 'yaml';
import _ from 'lodash';
import { CreateResource, PutResource } from '@/services/unstructured';
import { ConfigKind, IResponse } from '@/services/base.ts';

export interface NewWorkloadEditorModalProps {
  mode: 'create' | 'edit' | 'read';
  open: boolean;
  kind: ConfigKind;
  workloadContent?: string;
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

const NewConfigEditorModal: FC<NewWorkloadEditorModalProps> = (props) => {
  const { mode, open, workloadContent = '', onOk, onCancel, kind } = props;
  const [content, setContent] = useState<string>(workloadContent);
  useEffect(() => {
    setContent(workloadContent);
  }, [workloadContent]);

  function handleEditorChange(value: string | undefined) {
    setContent(value || '');
  }

  const title = useMemo(() => {
    switch (mode) {
      case 'read':
        return '查看配置';
      case 'edit':
        return '编辑配置';
      case 'create':
        return '新增配置';
    }
  }, [mode]);
  return (
    <Modal
      title={title}
      open={open}
      width={1000}
      okText={'确定'}
      cancelText={'取消'}
      destroyOnClose={true}
      onOk={async () => {
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
            await onOk(ret);
            setContent('');
          } else if (mode === 'edit') {
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
      <Form.Item label={'配置类型'}>
        <Select
          value={kind}
          disabled
          options={[
            {
              label: 'ConfigMap',
              value: ConfigKind.ConfigMap,
            },
            {
              label: 'Secret',
              value: ConfigKind.Secret,
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
          readOnly: mode === 'read',
          minimap: {
            enabled: false,
          },
        }}
        onChange={handleEditorChange}
      />
    </Modal>
  );
};

export default NewConfigEditorModal;
