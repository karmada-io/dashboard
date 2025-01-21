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
const glob = require('glob');
const debug = require('debug');

const debugMap = {};

/**
 * Return the debug instance according to the debugger name;
 * If the debug instance already exist, return it directly.
 * @param name
 * @returns {*|debug}
 */
function getDebug(name) {
    if (debugMap[name]) return debugMap[name];
    const d = debug(name);
    debugMap[name] = d;
    return d;
}


/**
 * ensure the existence of dir, if the dir not exist, it will create the dir.
 * @param dir
 * @returns
 */
function ensureDirExist(dir) {
    if (!dir) return false;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true,
        });
        return true;
    }
    return false;
}


/**
 *
 * @param options
 * @returns FileItem[]
 */
function parseFiles(options) {
    const getSourceFiles = (entry, exclude) => {
        return glob.sync(`${entry}/**/*.{js,ts,tsx,jsx}`, {
            ignore: exclude || [],
        });
    };
    const {entry, exclude} = options;
    const entries = [...entry];
    return entries.reduce((total, entryItem) => {
        const extendedExclude = exclude.map((excludeItem) =>
            path.join(entryItem, excludeItem),
        );
        const files = getSourceFiles(entryItem, extendedExclude).map((file) => {
            return {
                filePath: file,
                ext: path.extname(file),
            };
        });
        return total.concat(files);
    }, []);
}

/**
 * build locale fileName for target language
 * @param localesDir
 * @param lang
 * @returns {string}
 */
function buildLocalFilename(localesDir, lang) {
    return path.join(localesDir, `${lang}.json`)
}

module.exports = {
    getDebug,
    ensureDirExist,
    parseFiles,
    buildLocalFilename
}
