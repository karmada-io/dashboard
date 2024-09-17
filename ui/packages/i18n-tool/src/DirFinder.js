const fg = require('fast-glob');

async function findFiles(directory, excludePaths, callback, debugMode) {
    const log = (...args) => {
        if (debugMode) {
            console.log(...args);
        }
    };

    const pattern = `${directory}/**/*.{tsx,ts,js}`; 
    log(`使用的匹配模式: ${pattern}`);
    
    try {
        const files = await fg(pattern, {
            ignore: excludePaths,  
            absolute: true        
        });

        log(`匹配到的文件数: ${files.length}`);
        log(`所有文件: ${files.join(', ')}`);

        callback(files);
    } catch (err) {
        console.error('查找文件时发生错误:', err);
    }
}

module.exports = { findFiles };