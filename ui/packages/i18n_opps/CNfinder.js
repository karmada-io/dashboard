#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const babelParser = require('@babel/parser');
const babelTraverse = require('@babel/traverse').default;
const babelGenerator = require('@babel/generator').default;
const { Command } = require('commander');
const crypto = require('crypto');
const { exec } = require('child_process');

const program = new Command();

// 配置命令行选项
program
    .option('-d, --directory <path>', '指定文件夹路径') // 处理整个目录
    .option('-f, --file <path>', '指定单个文件路径') // 处理单个文件
    .parse(process.argv);

const options = program.opts();

// 如果没有指定目录或文件路径，输出错误并退出
if (!options.directory && !options.file) {
    console.error('请使用 -d <文件夹路径> 或 -f <文件路径> 指定文件夹或文件路径');
    process.exit(1);
}

// 生成唯一键值的方法，使用 MD5 哈希算法
const generateKey = (text) => crypto.createHash('md5').update(text).digest('hex');

// 指定 zh-CN.json 文件的路径
const zhCNFilePath = '/Users/yuhowmean/dashboard/ui/apps/dashboard/locales/zh-CN.json';

// 更新 zh-CN.json 文件，将新的键值对追加到文件末尾
const updateZhCNFile = (newEntries) => {
    if (!fs.existsSync(zhCNFilePath)) {
        console.error(`文件 ${zhCNFilePath} 不存在`);
        process.exit(1);
    }

    const existingData = JSON.parse(fs.readFileSync(zhCNFilePath, 'utf8'));
    const updatedData = { ...existingData, ...newEntries };

    fs.writeFileSync(zhCNFilePath, JSON.stringify(updatedData, null, 2), 'utf8');
    console.log(`已更新 ${zhCNFilePath}`);
};

// 处理 AST 树，识别中文并生成 i18n 键值对
const processAST = (ast) => {
    let CNpath = []; // 用来存储需要处理的节点信息
    let i18nMap = {}; // 用来存储生成的 i18n 键值对
    let i18nImported = false; // 标记是否已经导入了 i18nInstance

    // 遍历 AST，查找并处理目标节点
    babelTraverse(ast, {
        // 检查是否已经导入了 i18nInstance
        ImportDeclaration(path) {
            const sourceValue = path.node.source.value;
            if (sourceValue === '@/utils/i18n') {
                const specifier = path.node.specifiers.find(spec => spec.local.name === 'i18nInstance');
                if (specifier) {
                    i18nImported = true;
                }
            }
        },
        // 处理普通字符串节点
        StringLiteral(path) {
            const value = path.node.value;
            if (/[\u4e00-\u9fa5]/.test(value)) {
                const key = generateKey(value);
                i18nMap[key] = value;
                CNpath.push({ path, key, value, type: 'StringLiteral' });
            }
        },
        // 处理模板字符串节点
        TemplateLiteral(path) {
            path.node.quasis.forEach((quasi) => {
                const value = quasi.value.raw;
                if (/[\u4e00-\u9fa5]/.test(value)) {
                    const key = generateKey(value);
                    i18nMap[key] = value;
                    CNpath.push({ path: quasi, key, value, type: 'TemplateLiteral' });
                }
            });
        },
        // 处理 JSX 文本节点
        JSXText(path) {
            const value = path.node.value.trim();
            if (/[\u4e00-\u9fa5]/.test(value)) {
                const key = generateKey(value);
                i18nMap[key] = value;
                CNpath.push({ path, key, value, type: 'JSXText' });
            }
        },
        // 处理
        //
        // JSX 属性节点
        JSXAttribute(path) {
            const value = path.node.value && path.node.value.value;
            if (typeof value === 'string' && /[\u4e00-\u9fa5]/.test(value)) {
                const key = generateKey(value);
                i18nMap[key] = value;
                CNpath.push({ path, key, value, type: 'JSXAttribute' });
            }
        }
    });

    let modified = false; // 标记文件是否被修改
    // 遍历保存的节点信息，进行替换
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
        modified = true;
    });

    return { modified, i18nMap, i18nImported };
};

// 处理单个文件，识别中文并替换为 i18n 调用
const processFile = (filePath) => {
    try {
        // 读取文件内容并解析为 AST
        const tsxCode = fs.readFileSync(filePath, 'utf8');
        const ast = babelParser.parse(tsxCode, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
        });

        const { modified, i18nMap, i18nImported } = processAST(ast);

        if (modified) {
            let transformedCode = babelGenerator(ast).code;
            // 如果未导入 i18nInstance，则添加导入语句
            if (!i18nImported) {
                transformedCode = `import i18nInstance from '@/utils/i18n';\n` + transformedCode;
            }
            // 写回修改后的代码
            fs.writeFileSync(filePath, transformedCode, 'utf8');
            console.log(`已处理文件: ${filePath}`);
            updateZhCNFile(i18nMap); // 更新 zh-CN.json 文件
        } else {
            console.log(`文件未修改: ${filePath}`);
        }

    } catch (error) {
        console.error(`处理文件时发生错误: ${filePath}`, error.message);
    }
};

// 处理整个目录，递归处理所有符合条件的文件
const processDirectory = (dirPath) => {
    const pattern = `${dirPath}/**/*.{tsx,ts,js}`; // 匹配所有 tsx, ts, js 文件
    glob(pattern, (err, files) => {
        if (err) {
            console.error('查找文件时发生错误:', err);
            return;
        }

        files.forEach((file) => processFile(file));
    });
};

// 根据用户输入，处理文件或目录
if (options.file) {
    processFile(options.file);
} else if (options.directory) {
    processDirectory(options.directory);
}

console.log(`已完成对${options.file ? '文件' : '目录'} ${options.file || options.directory} 的处理`);

// 在处理完文件或目录后，执行 translate.js 脚本
const translateScriptPath = path.join(__dirname, 'translate.js');
exec(`node ${translateScriptPath}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`执行翻译脚本时发生错误: ${error.message}`);
        return;
    }
   /*
   if (stderr) {
        console.error(`翻译脚本的错误输出: ${stderr}`);
        return;
    }
    */
    console.log(`翻译脚本的输出:\n${stdout}`);
});