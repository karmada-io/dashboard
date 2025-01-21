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

const babelParser = require('@babel/parser');
const babelTraverse = require('@babel/traverse').default;
const babelGenerator = require('@babel/generator').default;
const t = require("@babel/types");
const crypto = require('node:crypto');

// Method to generate unique keys using the MD5 hash algorithm
const generateKey = (text) => crypto.createHash('md5').update(text).digest('hex');

// Process the AST tree, detect Chinese characters, and generate i18n key-value pairs
const processAST = (tsxCode, debugMode) => {
    const log = (...args) => {
        if (debugMode) {
            console.log(...args);
        }
    };

    const ast = babelParser.parse(tsxCode, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
    });

    let CNPath = [];  // Store paths of Chinese text
    let i18nMap = {}; // Store key-value pairs for i18n
    let i18nImported = false; // Flag to check if i18nInstance is imported

    // Traverse the AST and find the target nodes
    babelTraverse(ast, {
        ImportDeclaration(path) {
            const sourceValue = path.node.source.value;
            if (sourceValue === '@/utils/i18n') {
                const specifier = path.node.specifiers.find(spec => spec.local.name === 'i18nInstance');
                if (specifier) {
                    i18nImported = true;
                }
            }
        },
        StringLiteral(path) {
            const value = path.node.value;
            if (/[\u4e00-\u9fa5]/.test(value)) { // Check if the string contains Chinese characters
                const key = generateKey(value);
                if (!i18nMap[key]) {  
                    i18nMap[key] = value;
                    CNPath.push({ path, key, value, type: 'StringLiteral' });
                    log(`Detected Chinese text: ${value}`);
                }
            }
        },
        TemplateLiteral(path) {
            path.node.quasis.forEach((quasi) => {
                const value = quasi.value.raw;
                if (/[\u4e00-\u9fa5]/.test(value)) { // Check if the template contains Chinese characters
                    const key = generateKey(value);
                    if (!i18nMap[key]) {
                        i18nMap[key] = value;
                        CNPath.push({ path: quasi, key, value, type: 'TemplateLiteral' });
                        log(`Detected Chinese text: ${value}`);
                    }
                }
            });
        },
        JSXText(path) {
            const value = path.node.value.trim();
            if (/[\u4e00-\u9fa5]/.test(value)) { // Check if JSXText contains Chinese characters
                const key = generateKey(value);
                if (!i18nMap[key]) {
                    i18nMap[key] = value;
                    CNPath.push({ path, key, value, type: 'JSXText' });
                    log(`Detected Chinese text: ${value}`);
                }
            }
        },
        JSXAttribute(path) {
            const value = path.node.value && path.node.value.value;
            if (typeof value === 'string' && /[\u4e00-\u9fa5]/.test(value)) { // Check if JSXAttribute contains Chinese text
                const key = generateKey(value);
                if (!i18nMap[key]) {
                    i18nMap[key] = value;
                    CNPath.push({ path, key, value, type: 'JSXAttribute' });
                    log(`Detected Chinese text: ${value}`);
                }
            }
        }
    });

    return { ast, CNPath, i18nMap, i18nImported };
};

// Generate code and add i18nInstance.t calls
const generateCode = (ast, i18nImported, CNPath) => {
    CNPath.forEach(({ path, key, value, type }) => {
        if(isI18nInvoke(path)) {
            return
        }
        if (type === 'StringLiteral') {
            path.replaceWith(
                babelParser.parseExpression(`i18nInstance.t("${key}", "${value}")`)
            );
        } else if (type === 'TemplateLiteral' ) {
            path.value.raw = `\${i18nInstance.t("${key}", "${value}")}`;
        } else if (type === 'JSXText') {
            const jsxText = `i18nInstance.t("${key}", "${value}")`
            path.replaceWith(t.JSXExpressionContainer(babelParser.parseExpression(jsxText)))
        } else if (type === 'JSXAttribute') {
            path.node.value = babelParser.parseExpression(`i18nInstance.t("${key}", "${value}")`);
        }
    });

    let transformedCode = babelGenerator(ast).code;
    if (!i18nImported) {
        transformedCode = `import i18nInstance from '@/utils/i18n';\n` + transformedCode;
    }
    return transformedCode;
};

/**
 * check the ast node to detect whether the ast node is already in form of i18n
 * @param path
 * @returns {boolean}
 */
function isI18nInvoke(path) {
    if (!path || !path.parent ||
        !path.parent.callee ||
        !path.parent.callee.property || !path.parent.callee.object) return false;
    const property = path.parent.callee.property.name
    const object = path.parent.callee.object.name
    return object === "i18nInstance" && property === "t"
}

module.exports = { processAST, generateCode };
