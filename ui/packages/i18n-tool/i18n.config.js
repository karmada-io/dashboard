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

module.exports = {
    // entry for scan start
    entry: ['./src'],
    // files or subdirectories to be excluded from processing
    exclude: [
        'node_modules/**',
        'scripts/**',
        'dist/**',
        'vite.config.ts',
        'tailwind.config.js',
        'postcss.config.js',
        '**/*.d.ts',
        'utils/i18n.tsx',
    ],
    // path to the original locales directory
    localesDir: "./locales",
    // original lang
    originLang: "zh-CN",
    // target lang, can a list, currently we support  zh-CN、en-US
    targetLangs: ["en-US"],
    // [i18n keygen]
    prefixKey: '',
    keygenAlgorithm: 'md5',
    showOriginKey: true,
    // [i18n import config]
    i18nImport: "import i18nInstance from '@/utils/i18n';",
    i18nObject: 'i18nInstance',
    i18nMethod: 't',
    // [i18n translate provider]
    translate: {
        type: '',
        appid: '',
        model: '',
        key: '',
    }
};
