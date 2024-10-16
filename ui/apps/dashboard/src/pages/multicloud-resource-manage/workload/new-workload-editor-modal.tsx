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
    console.log('workloadContent', workloadContent);
    setContent(workloadContent);
  }, [workloadContent]);

  function handleEditorChange(value: string | undefined) {
    setContent(value || '');
  }
  return (
    <Modal
      title={`${mode === 'create' ? i18nInstance.t('66ab5e9f24c8f46012a25c89919fb191') : i18nInstance.t('95b351c86267f3aedf89520959bce689')}${i18nInstance.t('c3bc562e9ffcae6029db730fe218515c', '工作负载')}`}
      open={open}
      width={1000}
      okText={i18nInstance.t('38cf16f2204ffab8a6e0187070558721')}
      cancelText={i18nInstance.t('625fb26b4b3340f7872b411f401e754c')}
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
      <Form.Item label={'工作负载类型'}>
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
        }}
        onChange={handleEditorChange}
      />
    </Modal>
  );
};
export default NewWorkloadEditorModal;
