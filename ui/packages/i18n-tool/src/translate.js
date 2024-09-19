const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');

let zhCNFilePath = ''; // 原始的 locales 文件路径
let apiConfig = {}; // 翻译 API 配置

// 动态绑定文件路径
function bindFilePaths(zhPath) {
    zhCNFilePath = zhPath;
}

// 动态绑定API信息
function bindAPIInfo(api) {
    apiConfig = api;
}

// 生成 MD5 的方法（用于百度翻译API）
function calculateMD5(data) {
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
}

// 文本预处理
function preprocessText(text) {
    return text
        .replace(/\$\{([^\}]+)\}/g, 'PLACEHOLDER_$1')
        .replace(/：/g, ':')
        .replace(/，/g, ',')
        .replace(/\n/g, ' ');
}

// 处理 API 错误码
function handleApiErrorCode(errorCode) {
    const errorMessages = {
        '52001': '请求超时，检查请求内容并重试。',
        '52002': '系统错误，请稍后再试。',
        '52003': '未授权用户，请检查appid和服务是否开通。',
        '54000': '必填参数为空，请检查传入的参数。',
        '54001': '签名错误，请检查签名生成方法。',
        '54003': '访问频率受限，请降低调用频率或升级到高级版。',
        '54004': '账户余额不足，请前往管理控制台充值。',
        '54005': '长query请求过于频繁，稍后再试。',
        '58000': '客户端IP非法，请检查IP地址是否正确。',
        '58001': '不支持的翻译方向，检查是否在支持的语言列表中。',
        '58002': '服务已关闭，请前往管理控制台开启服务。',
        '90107': '认证未通过或未生效，请检查认证状态。',
        '20003': '请求内容存在安全风险，请检查请求内容。'
    };
    return errorMessages[errorCode] || `未知错误，错误码：${errorCode}`;
}

// 批量翻译功能，处理多个文本
async function translateBatchText(queries, retryCount = 3) {
    let translatedTexts = [];

    try {
        if (apiConfig.type === 'baidu') {
            // 百度翻译API逻辑
            const salt = new Date().getTime();
            const from = 'zh';
            const to = 'en';
            const query = queries.join('\n'); // 将多个query组合成一个请求

            const str1 = apiConfig.appid + query + salt + apiConfig.key;
            const sign = calculateMD5(str1);

            const result = await axios.get('http://api.fanyi.baidu.com/api/trans/vip/translate', {
                params: {
                    q: query,
                    appid: apiConfig.appid,
                    salt: salt,
                    from: from,
                    to: to,
                    sign: sign,
                },
            });

            if (result.data && result.data.error_code) {
                // 当API返回错误时，处理错误码
                const errorMessage = handleApiErrorCode(result.data.error_code);
                throw new Error(errorMessage);
            }

            if (result.data && result.data.trans_result) {
                translatedTexts = result.data.trans_result.map(item => item.dst);
            }
        } 
        // 如果需要支持其他翻译API，比如Google或DeepL，可以在这里扩展

        // 恢复占位符
        translatedTexts = translatedTexts.map(text =>
            text.replace(/PLACEHOLDER_([^\s]+)/g, '${$1}')
        );

        return translatedTexts;

    } catch (error) {
        console.error(`批量翻译失败: ${error.message}`);
        if (retryCount > 0) {
            console.log('重试批量翻译...');
            await delay(3000); // 延迟3秒再重试
            return translateBatchText(queries, retryCount - 1);
        } else {
            return queries.map(() => null); // 如果失败，返回null数组
        }
    }
}

// 批量处理文本
async function processBatch(keys, texts, resultData) {
    const translatedTexts = await translateBatchText(texts);
    
    keys.forEach((key, index) => {
        if (translatedTexts && translatedTexts[index]) {
            console.log(`翻译完成: ${texts[index]} -> ${translatedTexts[index]}`);
            resultData[key] = translatedTexts[index];
        } else {
            console.log(`翻译 ${texts[index]} 时出错，保留原始文本`);
            resultData[key] = texts[index]; // 保留原始文本
        }
    });
}

// 翻译并保存结果
async function translateAndSave() {
    // 验证 API 配置
    if (apiConfig.type === 'baidu' && (!apiConfig.appid || !apiConfig.key)) {
        console.error('请先设置百度API的 appid 和 key');
        return;
    }
    
    if (apiConfig.type === 'google' && !apiConfig.token) {
        console.error('请先设置 Google API 的 token');
        return;
    }

    if (apiConfig.type === 'deepl' && !apiConfig.key) {
        console.error('请先设置 DeepL API 的 key');
        return;
    }

    // 读取原始中文 locales 文件
    if (!zhCNFilePath || !fs.existsSync(zhCNFilePath)) {
        console.error(`文件路径 ${zhCNFilePath} 无效或不存在`);
        return;
    }

    const zhCNData = JSON.parse(fs.readFileSync(zhCNFilePath, 'utf8'));
    const enUSData = {};

    const zhCNDir = path.dirname(zhCNFilePath); // 获取 locales 文件所在的目录
    const enUSFilePath = path.join(zhCNDir, 'en-US.json'); // 生成 en-US 文件路径

    let keyBatch = [];
    let textBatch = [];

    for (const key in zhCNData) {
        if (zhCNData.hasOwnProperty(key)) {
            const text = zhCNData[key];
            console.log(`准备翻译: ${text}`);

            keyBatch.push(key);
            textBatch.push(preprocessText(text));

            if (keyBatch.length === 50) { // 批量处理文本以加快效率
                await processBatch(keyBatch, textBatch, enUSData);
                keyBatch = [];
                textBatch = [];

                // 批次处理完成后延迟3秒
                await delay(3000);
            }
        }
    }

    // 处理剩余的文本
    if (textBatch.length > 0) {
        await processBatch(keyBatch, textBatch, enUSData);
    }

    // 将翻译结果保存到 en-US.json 文件
    fs.writeFileSync(enUSFilePath, JSON.stringify(enUSData, null, 2), 'utf8');
    console.log(`已将翻译结果保存到 ${enUSFilePath}`);
}

// 添加延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { translateAndSave, bindFilePaths, bindAPIInfo };