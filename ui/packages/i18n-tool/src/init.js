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

const fs = require('node:fs');
const path = require('node:path');
const {getDebug} = require("./utils");
const debug = getDebug('init');

async function init(cmdOptions) {
    debug('execute scan method', cmdOptions);
    const srcDir = path.dirname( __filename)
    const i18nTemplateFilePath = path.join(srcDir, "../", "i18n.config.js")

    debug('i18nTemplateFilePath %s', i18nTemplateFilePath);
    const targetI18nConfigFilePath = path.join(process.cwd(), "i18n.config.cjs")
    fs.copyFileSync(i18nTemplateFilePath, targetI18nConfigFilePath)
}

module.exports = init
