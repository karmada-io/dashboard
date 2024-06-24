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
      title={'新增命名空间'}
      width={600}
      okText="确定"
      cancelText="取消"
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
          required: "'${name}' 是必选字段",
        }}
      >
        <Form.Item
          label="命名空间名称"
          name="name"
          required
          rules={[{ required: true }]}
        >
          <Input placeholder={'请输入命名空间名称'} />
        </Form.Item>
        <Form.Item
          label="是否跳过自动分发"
          name="skipAutoPropagation"
          required
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Radio value={true}>是</Radio>
            <Radio value={false}>否</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default NewNamespaceModal;
