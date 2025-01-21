/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import i18nInstance from '@/utils/i18n';
import { FC } from 'react';
import { Button, Upload } from 'antd';
import { Icons } from '@/components/icons';
import Editor, { EditorProps } from '@monaco-editor/react';

export type TextareaWithUploadProps = EditorProps & {
  readBlob?: typeof tryReadBlob;
  checkContent: (data: Awaited<ReturnType<typeof tryReadBlob>>) => boolean;
  // for customize form item element
  value?: string;
  onChange?: (value: string) => void;
  hideUploadButton?: boolean;
};

function tryReadBlob(file: Blob): Promise<{
  data: string | ArrayBuffer | null | undefined;
  err: any;
}> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.readAsText(file);

      reader.onload = function (event) {
        const content = event.target?.result;
        resolve({
          data: content,
          err: null,
        });
      };
    } catch (e) {
      resolve({
        data: '',
        err: e,
      });
    }
  });
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
    <div className="relative">
      <Editor
        // height="100px"
        // width="200px"
        defaultLanguage="yaml"
        value={_value}
        theme={'vs-dark'}
        onChange={(v) => {
          triggerChange(v || '');
        }}
        {...restProps}
      />

      {!hideUploadButton && (
        <Upload
          className="absolute top-[8px] right-[6px] z-[100]"
          beforeUpload={async (file) => {
            const d = await readBlob(file);
            const isValid = checkContent(d);
            if (isValid) {
              triggerChange(d.data as string);
            }
            return false;
          }}
          showUploadList={false}
        >
          <Button
            type={'primary'}
            icon={<Icons.uploadFile width={16} height={16} />}
            className="flex flex-row items-center"
          >
            {i18nInstance.t('aba41769112ffcc08cb563e29f460770')}
          </Button>
        </Upload>
      )}
    </div>
  );
};

export default TextareaWithUpload;
