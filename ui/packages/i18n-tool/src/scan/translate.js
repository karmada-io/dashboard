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

const fs = require("node:fs");
const translators = require('@karmada/translators')
const {getDebug} = require("../utils");
const {BaiduTranslator, DeepLTranslator, OpenAITranslator} = translators;
const debug = getDebug('translate');

async function translate(i18nMap, translateOpts) {
    debug("translateOpts: %O", translateOpts)
    const translator = initTranslator(translateOpts);

    const i18nMapKeys = Object.keys(i18nMap);
    if (i18nMapKeys.length === 0) return {}
    const reversedI18nMap = Object.keys(i18nMap).reduce((p, c) => {
        return {
            ...p,
            [i18nMap[c]]: c
        }
    }, {})
    let {from, to} = translateOpts

    const translateList = Object.keys(reversedI18nMap)
    const resp = await translator.batchTranslate({
        input: translateList,
        from,
        to,
    })
    return resp.output.reduce((p, c) => {
        const originI18nKey = reversedI18nMap[c.src]
        return {
            ...p,
            [originI18nKey]: c.dst
        }
    }, {})
}

function initTranslator(translateOpts) {
    const {type, appid, key, model} = translateOpts

    switch (type) {
        case "baidu": return new BaiduTranslator(appid, key);
    
        case "deepl": return new DeepLTranslator(key);

        case "openal": return new OpenAITranslator(key, model);

        default:
        debug('type of translate is not right');
    }

}

function updateLocale(localePath, newEntries, glossaries) {
    const _glossaries = glossaries || {}
    const existingData = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    const mergedData = {
        ...existingData,
        ...newEntries,
        ..._glossaries
    };
    fs.writeFileSync(localePath, JSON.stringify(mergedData, null, 2), 'utf8');
}

module.exports = {
    translate,
    updateLocale
}
