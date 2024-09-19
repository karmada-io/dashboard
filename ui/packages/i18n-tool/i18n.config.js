module.exports = {
    debug: false,       // 控制是否启用调试模式
    singleFile: [],   // 单个文件路径数组，用于 processAST
    directories: ["/Users/yuhowmean/dashboard/ui/apps/dashboard/src/pages/multicloud-resource-manage"],  // 需要处理的目录数组
    excludeFiles: [], // 需要排除的文件或子目录
    locales: '/Users/yuhowmean/dashboard/ui/apps/dashboard/locales/zh-CN.json',      // locales 文件路径
    processFile: false, // 是否执行 i18n 化过程
    translate: true,   // 是否执行翻译过程
    api: {             // 翻译 API 配置
        type: 'baidu', // 选择 'baidu', 'google', 'deepl'
        appid: '20240426002035431',     // 百度API需要的appid
        key: 'CBgSFH7dMNhyJ3gU2Vlj',       // 百度API需要的key
        token: '',     // DeepL/Google可能需要的token
    }
};