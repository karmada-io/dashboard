import { FC, useEffect, useState } from 'react';
import { Modal, Form, Input, Radio, Button, Select, Divider } from 'antd';
import TextareaWithUpload from '@/components/textarea-with-upload';
import { Icons } from '@/components/icons';
import {
  ClusterDetail,
  CreateCluster,
  UpdateCluster,
} from '@/services/cluster';
import type { LabelParam, TaintParam } from '@/services/cluster';
import { IResponse } from '@/services/base.ts';

export interface NewClusterModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOk: (ret: IResponse<any>) => void;
  onCancel: () => void;
  clusterDetail?: ClusterDetail;
}

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 4 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 20 },
  },
};

const formItemLayoutWithOutLabel = {
  wrapperCol: {
    xs: { span: 24, offset: 0 },
    sm: { span: 20, offset: 4 },
  },
};

const NewClusterModal: FC<NewClusterModalProps> = (props) => {
  const { mode, open, onOk, onCancel, clusterDetail } = props;
  const [form] = Form.useForm<{
    clusterName: string;
    mode: 'Pull' | 'Push';
    kubeconfig: string;
    labels: LabelParam[];
    taints: TaintParam[];
  }>();
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(
    mode !== 'create',
  );
  const [confirmLoading, setConfirmLoading] = useState(false);
  useEffect(() => {
    setShowAdvancedConfig(mode !== 'create');
  }, [mode]);
  useEffect(() => {
    if (mode === 'edit') {
      let initData = {
        clusterName: clusterDetail?.objectMeta?.name,
        mode: clusterDetail?.syncMode,
        taints: clusterDetail?.taints,
        labels: [] as LabelParam[],
      };
      if (clusterDetail?.objectMeta?.labels) {
        initData['labels'] = Object.keys(clusterDetail?.objectMeta?.labels).map(
          (k) => {
            return {
              key: k,
              value: clusterDetail?.objectMeta?.labels?.[k] || '',
            } as LabelParam;
          },
        );
      }
      form.setFieldsValue(initData);
    }
  }, [mode, clusterDetail, form]);
  return (
    <Modal
      open={open}
      title={mode === 'create' ? '新增集群' : '编辑集群'}
      width={800}
      okText="确定"
      cancelText="取消"
      destroyOnClose={true}
      confirmLoading={confirmLoading}
      onOk={async () => {
        try {
          setConfirmLoading(true);
          const submitData = await form.validateFields();
          if (mode === 'edit') {
            const ret = await UpdateCluster({
              clusterName: submitData.clusterName,
              labels: submitData.labels,
              taints: submitData.taints,
            });
            onOk(ret);
          } else if (mode === 'create') {
            const ret = await CreateCluster({
              clusterName: submitData.clusterName,
              kubeconfig: submitData.kubeconfig,
              mode: submitData.mode,
            });
            onOk(ret);
          }
        } catch (e) {
          console.log('e', e);
        } finally {
          setConfirmLoading(false);
        }
      }}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
    >
      <Form
        form={form}
        className={mode === 'create' ? 'min-h-[500px]' : 'min-h-[200px]'}
        validateMessages={{
          required: "'${name}' 是必选字段",
        }}
      >
        <Form.Item
          label="集群名称"
          name="clusterName"
          required
          rules={[{ required: true }]}
          {...formItemLayout}
        >
          <Input
            placeholder={'请输入集群名称'}
            disabled={mode !== 'create'}
            className={'w-[200px]'}
          />
        </Form.Item>
        <Form.Item label="接入模式" name="mode" required {...formItemLayout}>
          <Radio.Group disabled={mode !== 'create'}>
            <Radio value={'Push'}>Push</Radio>
            <Radio value={'Pull'}>Pull</Radio>
          </Radio.Group>
        </Form.Item>
        {mode === 'create' && (
          <Form.Item
            label="kubeconfig"
            name="kubeconfig"
            required
            rules={[{ required: true, message: '${label} is required' }]}
            {...formItemLayout}
          >
            <TextareaWithUpload
              height="300px"
              // width="500px"
              defaultLanguage="yaml"
              theme={'vs-dark'}
              options={{
                minimap: {
                  enabled: false,
                },
              }}
              // placeholder={'请输入被管集群的kubeconfig配置文件'}
              checkContent={(data) => {
                if (data.err) return false;
                return (data.data as string).indexOf('server:') !== -1;
              }}
            />
          </Form.Item>
        )}
        <Divider>
          <div
            className={'flex flex-row items-center space-x-4 cursor-pointer'}
            onClick={() => {
              setShowAdvancedConfig(!showAdvancedConfig);
            }}
          >
            <span>高级配置</span>
            <Icons.up
              width={16}
              height={16}
              className={'transition duration-500'}
              style={{
                transform: showAdvancedConfig ? 'rotate(180deg)' : 'none',
              }}
            />
          </div>
        </Divider>
        <div
          className={'transition-all duration-500'}
          style={{
            // visibility: showAdvancedConfig ? 'visible' : 'hidden'
            // height: showAdvancedConfig ? 'auto' : 0
            maxHeight: showAdvancedConfig ? '1000px' : '0',
            overflow: 'hidden',
          }}
        >
          <Form.List name="labels">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }, index) => (
                  <Form.Item
                    {...(index === 0
                      ? formItemLayout
                      : formItemLayoutWithOutLabel)}
                    label={index === 0 ? '集群标签' : ''}
                    required
                    key={key}
                  >
                    <div className={'flex flex-row items-center space-x-4'}>
                      <Form.Item
                        name={[name, 'key']}
                        rules={[
                          {
                            required: true,
                            message: 'label key必填',
                          },
                        ]}
                        noStyle
                      >
                        <Input
                          placeholder="请输出label的key"
                          className={'w-[150px]'}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[name, 'value']}
                        rules={[
                          {
                            required: true,
                            message: 'label value必填',
                          },
                        ]}
                        noStyle
                      >
                        <Input
                          placeholder="请输出label的value"
                          className={'w-[150px]'}
                        />
                      </Form.Item>
                      <Button
                        onClick={() => remove(name)}
                        icon={<Icons.delete width={16} height={16} />}
                        className="flex flex-row items-center border-none"
                      />
                    </div>
                  </Form.Item>
                ))}
                <Form.Item {...formItemLayoutWithOutLabel}>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<Icons.add />}
                    className="flex flex-row items-center justify-center h-[32px]"
                  >
                    新增集群标签
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.List name="taints">
            {(fields, { add, remove }) => {
              return (
                <>
                  {fields.map((field, index) => {
                    return (
                      <Form.Item
                        {...(index === 0
                          ? formItemLayout
                          : formItemLayoutWithOutLabel)}
                        label={index === 0 ? '集群污点' : ''}
                        required
                        key={field.key}
                      >
                        <div className={'flex flex-row items-center space-x-4'}>
                          <Form.Item
                            name={[field.name, 'key']}
                            rules={[{ required: true }]}
                            noStyle
                          >
                            <Input
                              placeholder="请输出taint的key"
                              className={'w-[200px]'}
                            />
                          </Form.Item>
                          {/*
                                                <Form.Item
                                                    name={[field.name, 'operator']}
                                                    noStyle
                                                >
                                                    <Select
                                                        style={{width: 100}}
                                                        options={[
                                                            {label: '=', value: '='},
                                                            {label: 'none', value: 'none'},
                                                        ]}
                                                    />
                                                </Form.Item>
                                                */}
                          <Form.Item
                            name={[field.name, 'value']}
                            rules={[{ required: true }]}
                            noStyle
                          >
                            <Input
                              placeholder="请输出taint的value"
                              className={'w-[200px]'}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'effect']}
                            rules={[{ required: true }]}
                            noStyle
                          >
                            <Select
                              style={{
                                width: 240,
                              }}
                              options={[
                                {
                                  label: 'NoSchedule',
                                  value: 'NoSchedule',
                                },
                                {
                                  label: 'PreferNoSchedule',
                                  value: 'PreferNoSchedule',
                                },
                                {
                                  label: 'NoExecute',
                                  value: 'NoExecute',
                                },
                              ]}
                            />
                          </Form.Item>
                          <Button
                            onClick={() => {
                              remove(field.name);
                            }}
                            icon={<Icons.delete width={16} height={16} />}
                            className="flex flex-row items-center border-none"
                          />
                        </div>
                      </Form.Item>
                    );
                  })}
                  <Form.Item {...formItemLayoutWithOutLabel}>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<Icons.add />}
                      className="flex flex-row items-center justify-center h-[32px]"
                    >
                      新增集群污点
                    </Button>
                  </Form.Item>
                </>
              );
            }}
          </Form.List>
        </div>
      </Form>
    </Modal>
  );
};

export default NewClusterModal;
