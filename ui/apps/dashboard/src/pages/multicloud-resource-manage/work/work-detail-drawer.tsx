/*
Copyright 2026 The Karmada Authors.

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
import { Drawer } from 'antd';
import Editor from '@monaco-editor/react';

export interface WorkDetailDrawerProps {
    open: boolean;
    name: string;
    namespace: string;
    content: string;
    onClose: () => void;
}

const WorkDetailDrawer: FC<WorkDetailDrawerProps> = ({
                                                         open,
                                                         name,
                                                         content,
                                                         onClose,
                                                     }) => {
    return (
        <Drawer
            open={open}
    title={`${name} ${i18nInstance.t('work_detail_title', 'Work 详情')}`}
    placement="right"
    width={800}
    styles={{ body: { padding: 0 } }}
    closeIcon={false}
    onClose={onClose}
    >
    <Editor
        defaultLanguage="yaml"
    value={content}
    theme="vs"
    options={{
        theme: 'vs',
            lineNumbers: 'on',
            fontSize: 15,
            readOnly: true,
            minimap: { enabled: false },
        wordWrap: 'on',
    }}
    />
    </Drawer>
);
};

export default WorkDetailDrawer;
