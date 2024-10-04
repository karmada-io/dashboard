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
