import i18nInstance from '@/utils/i18n';
import { FC, useEffect, useState } from 'react';
import { Form, Modal, Select } from 'antd';
import Editor from '@monaco-editor/react';
import { parse, stringify } from 'yaml';
import _ from 'lodash';
import { PutResource } from '@/services/unstructured';
import { CreateDeployment } from '@/services/workload';
import { IResponse, ServiceKind } from '@/services/base.ts';
export interface NewWorkloadEditorModalProps {
  mode: 'create' | 'edit' | 'detail';
  open: boolean;
  serviceContent?: string;
  onOk: (ret: IResponse<any>) => Promise<void> | void;
  onCancel: () => Promise<void> | void;
  kind: ServiceKind;
}
const ServiceEditorModal: FC<NewWorkloadEditorModalProps> = (props) => {
  const { mode, open, serviceContent = '', onOk, onCancel, kind } = props;
  const [content, setContent] = useState<string>(serviceContent);
  useEffect(() => {
    setContent(serviceContent);
  }, [serviceContent]);
  function handleEditorChange(value: string | undefined) {
    setContent(value || '');
  }
  return (
    <Modal
      title={
        mode === 'create'
          ? i18nInstance.t('c7961c290ec86485d8692f3c09b4075b', '新增服务')
          : i18nInstance.t('cc51f34aa418cb3a596fd6470c677bfe', '编辑服务')
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
            if (kind.toLowerCase() === 'deployment') {
              const ret = await CreateDeployment({
                namespace,
                name,
                content: stringify(yamlObject),
              });
              await onOk(ret);
              setContent('');
            }
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
      <Form.Item label={'服务类型'}>
        <Select
          value={kind}
          disabled
          options={[
            {
              label: 'Service',
              value: ServiceKind.Service,
            },
            {
              label: 'Ingress',
              value: ServiceKind.Ingress,
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
          readOnly: mode === 'detail',
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
export default ServiceEditorModal;
