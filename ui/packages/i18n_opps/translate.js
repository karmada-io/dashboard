const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

// 文件路径
const zhCNFilePath = '/Users/yuhowmean/dashboard/ui/apps/dashboard/locales/zh-CN.json';
const enUSFilePath = '/Users/yuhowmean/dashboard/ui/apps/dashboard/locales/en-US.json';

// 百度翻译 API 信息
const appid = '20240426002035431';
const key = 'CBgSFH7dMNhyJ3gU2Vlj';

function calculateMD5(data) {
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
}

function preprocessText(text) {
    let processedText = text.replace(/\$\{([^\}]+)\}/g, 'PLACEHOLDER_$1');
    processedText = processedText.replace(/：/g, ':').replace(/，/g, ',');
    processedText = processedText.replace(/\n/g, ' ');

    return processedText;
}

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

// 添加一个延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateAndSave() {
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

            // 在每次请求之间添加150毫秒的延迟
            await delay(150);
        }
    }

    fs.writeFileSync(enUSFilePath, JSON.stringify(enUSData, null, 2), 'utf8');
    console.log(`已将翻译结果保存到 ${enUSFilePath}`);
}

translateAndSave();
