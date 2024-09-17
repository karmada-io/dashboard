#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const { findFiles } = require('./src/DirFinder');
const { processAST, generateCode } = require('./src/processAST');
const { updateLocalesFile } = require('./src/updateLocales');
const { translateAndSave } = require('./src/translate');
const config = require('./i18n.config.js');

// 创建命令行工具
const program = new Command();

// 配置命令行工具
program
    .option('-c, --config <path>', '指定配置文件路径', './i18n.config.js') // 默认配置文件路径
    .parse(process.argv);

const options = program.opts();
const configFilePath = options.config;

// 加载配置文件
let userConfig;
if (fs.existsSync(configFilePath)) {
    userConfig = require(path.resolve(configFilePath));
} else {
    console.error(`配置文件 ${configFilePath} 不存在`);
    process.exit(1);
}

// 获取 debug 模式配置
const debugMode = userConfig.debug;

// 定义一个 log 函数，只在 debug 模式下打印日志
const log = (...args) => {
    if (debugMode) {
        console.log(...args);
    }
};

// 用来存储操作的日志
let actionsLog = [];
let filesProcessed = 0; // 用于统计总共处理了多少文件
let directoryFileCount = {}; // 记录每个目录中处理的文件数

log('当前配置:', userConfig);

// 验证用户传入的参数
const validateConfig = (config) => {
    if (!config.locales || (config.singleFile.length === 0 && config.directories.length === 0)) {
        console.error('必须绑定 locales 文件路径，并且指定至少一个 singleFile 或 directories');
        process.exit(1);
    }
    if (config.directories.length > 0 && config.excludeFiles.some(file => !config.directories.some(dir => file.startsWith(dir)))) {
        console.error('排除的文件或目录必须是指定的 directories 的子项');
        process.exit(1);
    }
};

// 执行 i18n 化过程
const executeI18nProcess = (filePath, localesPath) => {
    try {
        log(`开始处理文件: ${filePath}`);
        const tsxCode = fs.readFileSync(filePath, 'utf8');
        const { ast, CNpath, i18nMap, i18nImported } = processAST(tsxCode, debugMode);

        if (CNpath.length > 0) {
            log(`识别到的中文字符路径: ${CNpath.map(item => item.value).join(', ')}`);
            const transformedCode = generateCode(ast, i18nImported, CNpath);
            fs.writeFileSync(filePath, transformedCode, 'utf8');
            log(`处理完成: ${filePath}`);
            
            // 记录操作日志
            actionsLog.push(`处理文件: ${filePath}, 识别到 ${CNpath.length} 个中文字符`);

            // 将 i18nMap 保存到 locales 文件中
            const existingData = JSON.parse(fs.readFileSync(localesPath, 'utf8'));
            const updatedData = { ...existingData, ...i18nMap };
            updateLocalesFile(localesPath, updatedData, debugMode);
            log('locales 文件已更新');
            actionsLog.push(`更新了 locales 文件: ${localesPath}`);
        } else {
            log(`文件无变化或未识别到中文字符: ${filePath}`);
            actionsLog.push(`文件无变化: ${filePath}`);
        }
        filesProcessed++; // 每处理一个文件，计数器加1
    } catch (error) {
        console.error(`处理文件 ${filePath} 时发生错误:`, error);
    }
};

// 执行翻译过程
const executeTranslateProcess = () => {
    log('开始执行翻译过程...');
    if (userConfig.locales) {
        translateAndSave();
        actionsLog.push('执行翻译操作');
    } else {
        console.error('请绑定 locales 文件路径');
        process.exit(1);
    }
};

// 处理目录中的所有文件
const processDirectories = (directories, excludeFiles, localesPath) => {
    directories.forEach((directory) => {
        log(`开始处理目录: ${directory}`);
        findFiles(directory, excludeFiles, (files) => {
            if (files.length > 0) {
                log(`找到文件: ${files.join(', ')}`);
                let directoryProcessedCount = 0;
                files.forEach((file) => {
                    executeI18nProcess(file, localesPath);
                    directoryProcessedCount++;
                });
                // 记录每个目录处理的文件数
                directoryFileCount[directory] = directoryProcessedCount;
                actionsLog.push(`处理了目录: ${directory}, 共处理了 ${directoryProcessedCount} 个文件`);
            } else {
                log(`未找到需要处理的文件`);
                directoryFileCount[directory] = 0;
                actionsLog.push(`目录无文件可处理: ${directory}`);
            }
        });
    });
};

// 处理多个文件
const processFiles = (files, localesPath) => {
    files.forEach((file) => {
        log(`正在处理单个文件: ${file}`);
        executeI18nProcess(file, localesPath);
    });
    actionsLog.push(`处理了 ${files.length} 个单文件`);
};

// 验证并加载配置文件
validateConfig(userConfig);

// 执行 i18n 化和翻译操作
if (userConfig.processFile) {
    // 处理单个文件
    if (userConfig.singleFile.length > 0) {
        processFiles(userConfig.singleFile, userConfig.locales);
    }
    // 处理多个目录
    if (userConfig.directories.length > 0) {
        processDirectories(userConfig.directories, userConfig.excludeFiles, userConfig.locales);
    }
}

if (userConfig.translate) {
    executeTranslateProcess();
}

// 确保在所有异步处理完成后输出总结日志
setTimeout(() => {
    console.log('操作总结:');
    console.log(`处理了 ${userConfig.singleFile.length} 个单文件`);
    Object.keys(directoryFileCount).forEach((directory) => {
        console.log(`处理了目录: ${directory}, 共处理了 ${directoryFileCount[directory]} 个文件`);
    });
    console.log(`总共处理了 ${filesProcessed} 个文件`);
}, 500); // 适当等待异步操作完成