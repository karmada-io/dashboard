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

const path = require('node:path');
const fs = require('node:fs');
const chalk = require('chalk');

const defaultOptions = {
    entry: ['src'],
    exclude: [],

    localesDir: "src/locales",
    originLang: "zh-CN",
    targetLangs: ["en-US"],

    prefixKey: '',
    showOriginKey: true,
    keygenAlgorithm: 'md5',
};

/**
 * return default options for i18n-tools
 * @returns
 */
function getDefaultOptions() {
    return defaultOptions
}


/**
 * Try to parse i18n config from the specific file path
 * @param configPath
 */
async function parseI18nConfig(configPath) {
    const _configPath = generatePath(configPath)
    if (!fs.existsSync(_configPath)) {
        console.log(
            chalk.red(`I18n config file ${configPath} not exist, please check!`),
        );
        process.exit(1);
    }

    const configOptions = require(_configPath)
    configOptions.entry = (configOptions.entry || []).map((entryItem) =>
        generatePath(entryItem),
    );
    return {
        ...defaultOptions,
        ...configOptions,
    };
}

/**
 * Generate absolute path for the input path.
 * If the input path is relative path, it will expand as absolute path.
 * If the input path is absolute path, it will return directly.
 * @param p
 * @returns absolute path of input
 */
function generatePath(p) {
    const cwd = process.cwd();
    if (path.isAbsolute(p)) {
        return p;
    }
    return path.join(cwd, p);
}

module.exports = {
    getDefaultOptions,
    parseI18nConfig,
    generatePath,
}
