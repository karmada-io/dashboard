const babelParser = require('@babel/parser');
const babelTraverse = require('@babel/traverse').default;
const babelGenerator = require('@babel/generator').default;
const crypto = require('crypto');

// 生成唯一键值的方法，使用 MD5 哈希算法
const generateKey = (text) => crypto.createHash('md5').update(text).digest('hex');

// 处理 AST 树，识别中文并生成 i18n 键值对
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

    let CNpath = []; 
    let i18nMap = {}; 
    let i18nImported = false; 

    // 遍历 AST，查找并处理目标节点
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
            if (/[\u4e00-\u9fa5]/.test(value)) {
                const key = generateKey(value);
                if (!i18nMap[key]) {  
                    i18nMap[key] = value;
                    CNpath.push({ path, key, value, type: 'StringLiteral' });
                    log(`识别到的中文字符: ${value}`);
                }
            }
        },
        TemplateLiteral(path) {
            path.node.quasis.forEach((quasi) => {
                const value = quasi.value.raw;
                if (/[\u4e00-\u9fa5]/.test(value)) {
                    const key = generateKey(value);
                    if (!i18nMap[key]) {
                        i18nMap[key] = value;
                        CNpath.push({ path: quasi, key, value, type: 'TemplateLiteral' });
                        log(`识别到的中文字符: ${value}`);
                    }
                }
            });
        },
        JSXText(path) {
            const value = path.node.value.trim();
            if (/[\u4e00-\u9fa5]/.test(value)) {
                const key = generateKey(value);
                if (!i18nMap[key]) {
                    i18nMap[key] = value;
                    CNpath.push({ path, key, value, type: 'JSXText' });
                    log(`识别到的中文字符: ${value}`);
                }
            }
        },
        JSXAttribute(path) {
            const value = path.node.value && path.node.value.value;
            if (typeof value === 'string' && /[\u4e00-\u9fa5]/.test(value)) {
                const key = generateKey(value);
                if (!i18nMap[key]) {
                    i18nMap[key] = value;
                    CNpath.push({ path, key, value, type: 'JSXAttribute' });
                    log(`识别到的中文字符: ${value}`);
                }
            }
        }
    });

    return { ast, CNpath, i18nMap, i18nImported };
};

// 生成代码，添加 i18nInstance.t 调用
const generateCode = (ast, i18nImported, CNpath) => {
    CNpath.forEach(({ path, key, value, type }) => {
        if (type === 'StringLiteral') {
            path.replaceWith(
                babelParser.parseExpression(`i18nInstance.t("${key}", "${value}")`)
            );
        } else if (type === 'TemplateLiteral') {
            path.value.raw = `\${i18nInstance.t("${key}", "${value}")}`;
        } else if (type === 'JSXText') {
            path.replaceWith(babelParser.parseExpression(`i18nInstance.t("${key}", "${value}")`));
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

module.exports = { processAST, generateCode };