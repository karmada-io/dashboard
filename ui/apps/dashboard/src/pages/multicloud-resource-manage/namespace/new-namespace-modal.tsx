import i18nInstance from '@/utils/i18n';
import { FC } from 'react';
import { Modal, Form, Radio, Input } from 'antd';
import { CreateNamespace } from '@/services/namespace.ts';
import { IResponse } from '@/services/base.ts';
interface NewNamespaceModalProps {
  open?: boolean;
  onOk?: (ret: IResponse<string>) => Promise<void>;
  onCancel?: () => Promise<void>;
}

const NewNamespaceModal: FC<NewNamespaceModalProps> = (props) => {
  const { open, onOk, onCancel } = props;
  const [form] = Form.useForm<{
    name: string;
    skipAutoPropagation: boolean;
  }>();

  return (
    <Modal
      open={open}
      title={i18nInstance.t('ac2f01145a5c4a9aaaf2f828650d91a3')}
      width={600}
      okText={i18nInstance.t('38cf16f2204ffab8a6e0187070558721')}
      cancelText={i18nInstance.t('625fb26b4b3340f7872b411f401e754c')}
      onOk={async () => {
        try {
          const submitData = await form.validateFields();
          const ret = await CreateNamespace(submitData);
          if (ret.code === 200) {
            form.resetFields();
          }
          onOk && (await onOk(ret));
        } catch (e) {
          console.log('e', e);
        }
      }}
      onCancel={async () => {
        form.resetFields();
        onCancel && (await onCancel());
      }}
      destroyOnClose={true}
    >
      <Form
        form={form}
        className={'h-[100px]'}
        validateMessages={{
          required: i18nInstance.t('e0a23c19b8a0044c5defd167b441d643'),
        }}
      >
        <Form.Item
          label={i18nInstance.t('06ff2e9eba7ae422587c6536e337395f')}
          name="name"
          required
          rules={[{ required: true }]}
        >
          <Input
            placeholder={i18nInstance.t('6375184207a6497c71d305f93908c8a1')}
          />
        </Form.Item>
        <Form.Item
          label={i18nInstance.t('d41f6609ddbfa15fb95074a463f3b71a')}
          name="skipAutoPropagation"
          required
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Radio value={true}>
              {i18nInstance.t('0a60ac8f02ccd2cf723f927284877851')}
            </Radio>
            <Radio value={false}>
              {i18nInstance.t('c9744f45e76d885ae1c74d4f4a934b2e')}
            </Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default NewNamespaceModal;
