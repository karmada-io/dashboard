# Install


```shell
npm install -g @karmada/i18n-tool
```


# Basic Usage
For a whole frontend project which need to i18n, you can do as following:
```shell
# init config for under your project
# here you can modify the config according to the instructions
i18n-tool/node_modules/.bin/i18n-tool init

# scan the Chinese and replace with i18n function invoke
# generate corresponding locales files
i18n-tool/node_modules/.bin/i18n-tool scan -c ./i18n.config.cjs
```

For a directory which need to i18n, you can specify with `-d` options 
```shell
i18n-tool/node_modules/.bin/i18n-tool scan -d directory/to/your/code
```

For a single file which need to i18n, you can specify with `-f` options 
```shell
i18n-tool/node_modules/.bin/i18n-tool scan -f path/to/your/code/file
```

# Advanced Usage
For those advanced developer, maybe they need to specify glossaries install of automatic translation. For these kind of 
scenarios, you can create a `glossaries.csv` under the directory of locales, the format of `glossaries.csv` should like
```csv
i18n-key,zh-CN,en-US
86385379cf9cfbc2c554944f1c054a45,概览,Overview
21a4e07b08a4efbbfe2b9d88c208836a,多云资源管理,MultiCloud Resource Management
85fe5099f6807dada65d274810933389,集群,Cluster
```
after create the `glossaries.csv`, for the same i18n-key, `i18n-tool` will use the content specified in `glossaries.csv` 
instead of automatic translation.

 