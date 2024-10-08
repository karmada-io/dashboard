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