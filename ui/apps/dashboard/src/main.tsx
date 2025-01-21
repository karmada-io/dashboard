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

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import i18nInstance, {getLang} from '@/utils/i18n';
import {initReactI18next} from 'react-i18next';
import {loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// https://github.com/remcohaszing/monaco-yaml/issues/150
import yamlWorker from '@/utils/workaround-yaml.worker?worker';
import enTexts from '../locales/en-US.json';
import zhTexts from '../locales/zh-CN.json';
import {initRoute} from '@/routes/route.tsx';

window.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'yaml') {
            return new yamlWorker();
        }
        return new editorWorker();
    },
};
loader.config({monaco});

i18nInstance
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        debug: true,
        lng: getLang(), // if you're using a language detector, do not define the lng option
        fallbackLng: ['zh-CN'],
        resources: {
            zh: {
                translation: zhTexts,
            },
            en: {
                translation: enTexts,
            },
        },
        interpolation: {
            escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
        },
        saveMissing: true, // send not translated keys to endpoint,
        react: {
            useSuspense: false,
        },
    })
    .then(() => {
        initRoute();
        ReactDOM.createRoot(document.getElementById('root')!).render(
            <React.StrictMode>
                <App/>
            </React.StrictMode>,
        );
    })
    .catch(() => {

    })
