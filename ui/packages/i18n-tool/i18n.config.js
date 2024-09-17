module.exports = {
    debug: false,       // 控制是否启用调试模式
    singleFile: [],   // 单个文件路径数组，用于 processAST
    directories: [],  // 需要处理的目录数组
    excludeFiles: [], // 需要排除的文件或子目录
    locales: '',      // locales 文件路径
    processFile: true, // 是否执行 i18n 化过程
    translate: false // 是否执行翻译过程
};