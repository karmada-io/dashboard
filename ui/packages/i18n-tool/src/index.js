#!/usr/bin/env node

const {Command} = require('commander');
const chalk = require('chalk');
const pkgInfo = require('../package.json');

const scan = require('./scan')
const init = require('./init')



// Create command-line tool
const program = new Command();
program
    .name(pkgInfo.name)
    .description(pkgInfo.description)
    .version(pkgInfo.version, '-v, --version')
    .option('-d, --directory <path>', 'specify folder path')
    .option('-f, --file <path>', 'specify a single file path')
    // If not specified, will look for the config in the same directory as i18n-tool
    .option(
        '-c, --config <path>',
        'specify the configuration file path, default is ./i18n.config.cjs',
        './i18n.config.cjs'
    )

program
    .command('scan')
    .alias('s')
    .description('scan target language text from code')
    .action(async () => {
        const options = program.opts();
        await scan(options);
    });

program
    .command('init')
    .description('init i18n.config.js for current project')
    .action(async () => {
        const options = program.opts();
        await init(options);
    });

program.parseAsync(process.argv).catch((error) => {
    console.error(chalk.red(error.stack));
    process.exit(1);
});
