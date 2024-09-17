const fs = require('fs');

function updateLocalesFile(localesPath, newEntries, debugMode) {
    const log = (...args) => {
        if (debugMode) {
            console.log(...args);
        }
    };

    if (!fs.existsSync(localesPath)) {
        console.error(`文件 ${localesPath} 不存在`);
        process.exit(1);
    }

    const existingData = JSON.parse(fs.readFileSync(localesPath, 'utf8'));
    const updatedData = { ...existingData };

    Object.keys(newEntries).forEach((key) => {
        if (!existingData[key]) {
            updatedData[key] = newEntries[key]; 
        } else {
            log(`键 ${key} 已存在，跳过添加`);
        }
    });

    fs.writeFileSync(localesPath, JSON.stringify(updatedData, null, 2), 'utf8');
    log(`已更新 ${localesPath}`);
}

module.exports = { updateLocalesFile };