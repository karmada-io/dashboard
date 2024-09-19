module.exports = {
    debug: false,       // Controls whether to enable debug mode
    singleFile: [],     // Array of single file paths, used for processing with processAST
    directories: ["/Users/yuhowmean/dashboard/ui/apps/dashboard/src/pages/multicloud-resource-manage"],  // Array of directories to be processed
    excludeFiles: [],   // Files or subdirectories to be excluded from processing
    locales: '/Users/yuhowmean/dashboard/ui/apps/dashboard/locales/zh-CN.json',  // Path to the original Chinese locales file
    processFile: false, // Whether to execute the i18n process for localization
    translate: true,    // Whether to execute the translation process
    targetLanguage: 'jp', // Target language code, e.g., 'en' (English), 'de' (German), 'jp' (Japanese), etc.
    api: {              // Translation API configuration
        type: 'baidu',   // Choose 'baidu', 'google', or 'deepl' as the translation API provider
        appid: '20240426002035431',       // The appid required for Baidu API
        key: 'CBgSFH7dMNhyJ3gU2Vlj',         // The key required for Baidu and DeepL APIs
        token: '',       // Token that may be required for Google API
    }
};