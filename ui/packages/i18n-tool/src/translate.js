const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

// 动态传入文件路径和 API 信息
let zhCNFilePath = '';
let enUSFilePath = '';
let appid = '';
let key = '';

// 动态绑定文件路径
function bindFilePaths(zhPath, enPath) {
    zhCNFilePath = zhPath;
    enUSFilePath = enPath;
}

// 动态绑定API信息
function bindAPIInfo(apiAppid, apiKey) {
    appid = apiAppid;
    key = apiKey;
}

// 生成 MD5 的方法
function calculateMD5(data) {
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
}

// 文本预处理
function preprocessText(text) {
    let processedText = text.replace(/\$\{([^\}]+)\}/g, 'PLACEHOLDER_$1');
    processedText = processedText.replace(/：/g, ':').replace(/，/g, ',');
    processedText = processedText.replace(/\n/g, ' ');

    return processedText;
}

// 翻译功能
async function translateText(query, retryCount = 3) {
    const salt = new Date().getTime();
    const from = 'zh';
    const to = 'en';
    const str1 = appid + query + salt + key;
    const sign = calculateMD5(str1);

    try {
        const result = await axios.get('http://api.fanyi.baidu.com/api/trans/vip/translate', {
            params: {
                q: query,
                appid: appid,
                salt: salt,
                from: from,
                to: to,
                sign: sign,
            },
        });

        if (result.data && result.data.trans_result) {
            let translatedText = result.data.trans_result[0].dst;
            translatedText = translatedText.replace(/PLACEHOLDER_([^\s]+)/g, '${$1}');
            return translatedText;
        } else {
            throw new Error('翻译API响应格式不正确');
        }
    } catch (error) {
        console.error(`翻译失败: ${error.message}`);
        if (retryCount > 0) {
            console.log(`重试翻译: ${query}`);
            return translateText(query, retryCount - 1);
        } else {
            return null;
        }
    }
}

// 添加延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 翻译并保存结果
async function translateAndSave() {
    if (!appid || !key) {
        console.error('请先设置 API 信息 (appid 和 key)');
        return;
    }

    const zhCNData = JSON.parse(fs.readFileSync(zhCNFilePath, 'utf8'));
    const enUSData = {};

    for (const key in zhCNData) {
        if (zhCNData.hasOwnProperty(key)) {
            const text = zhCNData[key];
            console.log(`正在翻译: ${text}`);

            const preprocessedText = preprocessText(text);
            const translatedText = await translateText(preprocessedText);

            if (translatedText) {
                console.log(`翻译完成: ${text} -> ${translatedText}`);
                enUSData[key] = translatedText;
            } else {
                console.log(`翻译 ${text} 时出错`);
                enUSData[key] = text; // 保留原始文本
            }

            // 每次请求之间延迟150ms
            await delay(150);
        }
    }

    fs.writeFileSync(enUSFilePath, JSON.stringify(enUSData, null, 2), 'utf8');
    console.log(`已将翻译结果保存到 ${enUSFilePath}`);
}

module.exports = { translateAndSave, bindFilePaths, bindAPIInfo };
