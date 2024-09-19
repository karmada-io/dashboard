const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');

let zhCNFilePath = ''; // Original locales file path
let apiConfig = {};    // Translation API configuration
let targetLanguage = ''; // Target language

// Dynamically bind the file path
function bindFilePaths(zhPath) {
    zhCNFilePath = zhPath;
}

// Dynamically bind the API configuration and target language
function bindAPIInfo(api, targetLang) {
    apiConfig = api;
    targetLanguage = targetLang || 'en'; // Default to 'en' if no target language is provided
}

// Generate an MD5 hash (used for Baidu Translate API)
function calculateMD5(data) {
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
}

// Preprocess text by replacing placeholders and symbols
function preprocessText(text) {
    return text
        .replace(/\$\{([^\}]+)\}/g, 'PLACEHOLDER_$1')
        .replace(/：/g, ':')
        .replace(/，/g, ',')
        .replace(/\n/g, ' ');
}

// Handle Baidu API error codes and return corresponding error messages
function handleApiErrorCode(errorCode) {
    const errorMessages = {
        '52001': 'Request timed out. Please check your request and try again.',
        '52002': 'System error. Please try again later.',
        '52003': 'Unauthorized user. Please check if the appid is correct or if the service is activated.',
        '54000': 'Required parameter is missing. Please check the input parameters.',
        '54001': 'Signature error. Please check your signature generation method.',
        '54003': 'Access frequency limit reached. Please reduce the request frequency or upgrade to a higher plan.',
        '54004': 'Insufficient account balance. Please recharge in the management console.',
        '54005': 'Frequent long-query requests. Please try again later.',
        '58000': 'Illegal client IP. Please check if the IP address is correct.',
        '58001': 'Unsupported translation direction. Check if the language is supported.',
        '58002': 'Service has been shut down. Please enable it in the management console.',
        '90107': 'Authentication failed or has not taken effect. Please check the authentication status.',
        '20003': 'Request contains security risks. Please check the content of the request.'
    };
    return errorMessages[errorCode] || `Unknown error, error code: ${errorCode}`;
}

// Batch translation function to process multiple text strings
async function translateBatchText(queries, retryCount = 3) {
    let translatedTexts = [];

    try {
        // Baidu Translate API logic
        if (apiConfig.type === 'baidu') {
            const salt = new Date().getTime();
            const from = 'zh'; // Source language is Chinese
            const to = targetLanguage; // Target language from config
            const query = queries.join('\n'); // Combine multiple queries into one request

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
                // Handle Baidu API error codes
                const errorMessage = handleApiErrorCode(result.data.error_code);
                throw new Error(errorMessage);
            }

            if (result.data && result.data.trans_result) {
                translatedTexts = result.data.trans_result.map(item => item.dst);
            }
        }
        // Google Translate API logic
        else if (apiConfig.type === 'google') {
            const result = await axios.post(
                'https://translation.googleapis.com/language/translate/v2', 
                {
                    q: queries.join('\n'), // Combine multiple queries
                    source: 'zh',
                    target: targetLanguage,
                    format: 'text'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiConfig.token}`, // Use Google API token
                    },
                }
            );

            if (result.data && result.data.error) {
                // Handle Google API errors
                throw new Error(`Google API Error: ${result.data.error.message}`);
            }

            if (result.data && result.data.data && result.data.data.translations) {
                translatedTexts = result.data.data.translations.map(item => item.translatedText);
            }
        }
        // DeepL Translate API logic
        else if (apiConfig.type === 'deepl') {
            const result = await axios.post(
                'https://api-free.deepl.com/v2/translate',
                null,
                {
                    params: {
                        auth_key: apiConfig.key, // DeepL API key
                        text: queries.join('\n'), // Combine multiple queries
                        target_lang: targetLanguage.toUpperCase(), // DeepL uses uppercase language codes, e.g., 'EN', 'DE'
                    },
                }
            );

            if (result.data && result.data.message) {
                // Handle DeepL API errors
                throw new Error(`DeepL API Error: ${result.data.message}`);
            }

            if (result.data && result.data.translations) {
                translatedTexts = result.data.translations.map(item => item.text);
            }
        }

        // Restore placeholders
        translatedTexts = translatedTexts.map(text =>
            text.replace(/PLACEHOLDER_([^\s]+)/g, '${$1}')
        );

        return translatedTexts;

    } catch (error) {
        console.error(`Batch translation failed: ${error.message}`);
        if (retryCount > 0) {
            console.log('Retrying batch translation...');
            await delay(3000); // Delay for 3 seconds before retrying
            return translateBatchText(queries, retryCount - 1);
        } else {
            return queries.map(() => null); // Return null array if translation fails
        }
    }
}

// Batch processing of text, handling 50 entries at a time
async function processBatch(keys, texts, resultData) {
    const translatedTexts = await translateBatchText(texts);
    
    keys.forEach((key, index) => {
        if (translatedTexts && translatedTexts[index]) {
            console.log(`Translation complete: ${texts[index]} -> ${translatedTexts[index]}`);
            resultData[key] = translatedTexts[index];
        } else {
            console.log(`Error translating ${texts[index]}, retaining original text`);
            resultData[key] = texts[index]; // Retain original text if translation fails
        }
    });
}

// Translate and save the result
async function translateAndSave() {
    // Validate API configuration
    if (apiConfig.type === 'baidu' && (!apiConfig.appid || !apiConfig.key)) {
        console.error('Please set the appid and key for Baidu API.');
        return;
    }

    if (apiConfig.type === 'google' && !apiConfig.token) {
        console.error('Please set the token for Google API.');
        return;
    }

    if (apiConfig.type === 'deepl' && !apiConfig.key) {
        console.error('Please set the key for DeepL API.');
        return;
    }

    // Read the original Chinese locales file
    if (!zhCNFilePath || !fs.existsSync(zhCNFilePath)) {
        console.error(`File path ${zhCNFilePath} is invalid or does not exist.`);
        return;
    }

    const zhCNData = JSON.parse(fs.readFileSync(zhCNFilePath, 'utf8'));
    const targetLocaleFile = `${targetLanguage}.json`;  // Name the file based on the target language
    const resultData = {};  // Store the translation results

    const zhCNDir = path.dirname(zhCNFilePath); // Get the directory of the locales file
    const targetLocalePath = path.join(zhCNDir, targetLocaleFile); // Generate the file path based on the target language

    let keyBatch = [];
    let textBatch = [];

    for (const key in zhCNData) {
        if (zhCNData.hasOwnProperty(key)) {
            const text = zhCNData[key];
            console.log(`Preparing translation: ${text}`);

            keyBatch.push(key);
            textBatch.push(preprocessText(text));

            if (keyBatch.length === 50) {  // Process in batches of 50 texts
                await processBatch(keyBatch, textBatch, resultData);
                keyBatch = [];
                textBatch = [];

                // Delay for 3 seconds after each batch
                await delay(3000);
            }
        }
    }

    // Process any remaining texts
    if (textBatch.length > 0) {
        await processBatch(keyBatch, textBatch, resultData);
    }

    // Save the translation results to the target language file
    fs.writeFileSync(targetLocalePath, JSON.stringify(resultData, null, 2), 'utf8');
    console.log(`Translation results saved to ${targetLocalePath}`);
}

// Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { translateAndSave, bindFilePaths, bindAPIInfo };