# KARMADA
Thanks to KubeSphere and Harvester for providing back-end support for this system.
## 电脑需要安装 node 环境

## 安装依赖命令

```
npm install
```

### 编译及热加载命令

```
npm run dev
```

### 生产环境打包命令

```
npm run build
```

### 项目目录结构

├── dist `发布打包后静态文件目录`
├── node_modules `node模块安装目录`
├── src `开发目录`
│   ├── api `接口`
│   ├── assets `主题、字体、图片等静态资源`
│   ├── components `全局公用组件`
│   ├── mixin `复用代码`
│   ├── router `路径声明`
│   ├── store `vuex存储`
│   ├── styles `全局样式文件`
│   ├── utils `全局公用方法`
│   ├── views `所有页面目录`
├── app.vue `项目入口页面`
├── main.js `项目入口文件`
├── .env.xxx `环境变量配置`
├── .eslintrc.js `eslintrc配置项`
├── .gitignore `忽略编译生成的中间文件`
├── babel.config.js `babel配置文件`
├── package-lock.json `模块与模块之间的依赖关系文件`
├── package.json `项目描述文件`
├── README.md `项目说明文档`
├── vue.config.js `vue-cli 配置`