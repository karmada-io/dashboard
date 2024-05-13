import {Modal, Form, Input} from 'antd'
import TextareaWithUpload from '@/components/textarea-with-upload'

const NewClusterModal = () => {
    const [form] = Form.useForm<{
        clusterName: string,
        kubeconfig: string,
    }>()
    return (
        <Modal
            open={false}
            title={'新增集群'}
            width={800}
            okText='确定'
            cancelText='取消'
            onOk={async() => {
                try {
                    const submitData= await form.validateFields()
                    console.log('submitData', submitData)
                } catch (e) {
                    console.log('e', e)
                }
            }}
        >
            <Form
                form={form}
                className={'h-[500px]'}
                validateMessages={{
                    required: "'${name}' 是必选字段",
                }}
            >
                <Form.Item
                    label="clusterName"
                    name='clusterName'
                    required
                    rules={[{ required: true, message: '${label} is required' }]}
                >
                    <Input placeholder={'请输入集群名称'}/>
                </Form.Item>
                <Form.Item
                    label='kubeconfig'
                    name='kubeconfig'
                    required
                    rules={[{ required: true, message: '${label} is required' }]}
                >
                    <TextareaWithUpload
                        height="400px"
                        // width="500px"
                        defaultLanguage="yaml"
                        theme={'vs-dark'}
                        // placeholder={'请输入被管集群的kubeconfig配置文件'}
                        checkContent={(data) => {
                            if (data.err) return false
                            return (data.data as string).indexOf("server:") !== -1
                        }}
                    />
                </Form.Item>
            </Form>
        </Modal>
    )
}

export default NewClusterModal