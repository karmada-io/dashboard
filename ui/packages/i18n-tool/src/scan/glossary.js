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

const fs = require("node:fs")
const {parse} = require('csv-parse/sync')
const {omit} = require('lodash')

function makeGlossaryMap(records) {
    const _records = records || []
    return _records.reduce((p, c) => {
        const i18nKey = c['i18n-key']
        const restData = omit(c, 'i18n-key')
        return {
            ...p,
            [i18nKey]: restData
        }
    }, {})
}

function initGlossaries(glossaryFilePath) {
    if (!fs.existsSync(glossaryFilePath)) return {}
    const content = fs.readFileSync(glossaryFilePath).toString()
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
    });
    return makeGlossaryMap(records)
}

module.exports = {
    initGlossaries
}
