import {FC, useEffect, useState} from 'react';
import {Modal} from "antd";
import Editor from '@monaco-editor/react';
import {editor} from "monaco-editor";
import {parse} from "yaml";
import _ from 'lodash';
import {PutResource} from '@/services/unstructured';
import {IResponse} from "@/services/base.ts";

export interface NewWorkloadEditorModalProps {
    mode: 'create' | 'edit';
    open: boolean;
    workloadContent?: string;
    onOk: (ret: IResponse<any>) => Promise<void>
    onCancel: () => Promise<void>
}

const NewWorkloadEditorModal: FC<NewWorkloadEditorModalProps> = (props) => {
    const {mode, open, workloadContent = '', onOk, onCancel} = props;
    const [content, setContent] = useState<string>(workloadContent)
    useEffect(() => {
        setContent(workloadContent)
    }, [workloadContent])

    function handleEditorChange(value: string | undefined, _: editor.IModelContentChangedEvent) {
        setContent(value || '')
    }

    return <Modal
        title={`${mode === 'create' ? '新增' : '编辑'}工作负载`}
        open={open}
        width={1000}
        okText='确定'
        cancelText='取消'
        onOk={async () => {
            // await onOk()
            try {
                const yamlObject = parse(content)
                const kind = _.get(yamlObject, 'kind')
                const namespace = _.get(yamlObject, 'metadata.namespace')
                const name = _.get(yamlObject, 'metadata.name')

                const ret = await PutResource({
                    kind, name, namespace,
                    content: yamlObject
                })
                await onOk(ret)
            } catch (e) {
                console.log('e', e)
            }
        }}
        onCancel={onCancel}
    >
        <Editor
            height="600px"
            defaultLanguage="yaml"
            value={content}
            theme='vs-dark'
            options={{
                theme: 'vs-dark',
                lineNumbers: 'on',
                minimap: {
                    enabled: false,
                },
            }}
            onChange={handleEditorChange}
        />
    </Modal>
}
export default NewWorkloadEditorModal;