import {FC} from 'react';
import {Button, Upload,} from 'antd'
import {Icons} from '@/components/icons';
import Editor, {EditorProps} from '@monaco-editor/react';

export type TextareaWithUploadProps = EditorProps & {
    readBlob?: typeof tryReadBlob
    checkContent: (data: Awaited<ReturnType<typeof tryReadBlob>>) => boolean;
    // for customize form item element
    value?: string;
    onChange?: (value: string) => void;
    hideUploadButton?: boolean;
}

function tryReadBlob(file: Blob): Promise<{
    data: string | ArrayBuffer | null | undefined,
    err: any
}> {
    return new Promise((resolve) => {
        try {
            const reader = new FileReader();
            reader.readAsText(file);

            reader.onload = function (event) {
                const content = event.target?.result;
                resolve({
                    data: content,
                    err: null
                })
            };
        } catch (e) {
            resolve({
                data: '',
                err: e
            })
        }
    })
}


const TextareaWithUpload: FC<TextareaWithUploadProps> = (props) => {
    const {
        readBlob = tryReadBlob,
        checkContent,
        value: _value,
        onChange,
        hideUploadButton = false,
        ...restProps
    } = props;
    const triggerChange = (changedValue: string) => {
        onChange?.(changedValue);
    };
    return (
        <div className='relative'>
            <Editor
                // height="100px"
                // width="200px"
                defaultLanguage="yaml"
                value={_value}
                theme={'vs-dark'}
                onChange={(v) => {
                    triggerChange(v || '')
                }}
                {...restProps}
            />
            {
                !hideUploadButton &&
                <Upload
                    className='absolute top-[8px] right-[6px] z-[100]'
                    beforeUpload={async (file) => {
                        const d = await readBlob(file)
                        const isValid = checkContent(d)
                        if (isValid) {
                            triggerChange(d.data as string)
                        }
                        return false
                    }}
                    showUploadList={false}
                >
                    <Button
                        type={'primary'}
                        icon={<Icons.uploadFile width={16} height={16}/>}
                        className='flex flex-row items-center'
                    >
                        选择kubeconfig文件
                    </Button>
                </Upload>
            }
        </div>
    )
}

export default TextareaWithUpload;