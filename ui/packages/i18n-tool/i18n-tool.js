#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const { findFiles } = require('./src/DirFinder');
const { processAST, generateCode } = require('./src/processAST');
const { updateLocalesFile } = require('./src/updateLocales');
const { translateAndSave, bindFilePaths, bindAPIInfo } = require('./src/translate');

// Create command-line tool
const program = new Command();

// Configure command-line tool
program
    .option('-c, --config <path>', 'Specify the configuration file path') // If not specified, will look for the config in the same directory as i18n-tool
    .parse(process.argv);

const options = program.opts();

// If the user does not specify the config file path, use the default path in the same directory as i18n-tool.js
let configFilePath = options.config;

if (!configFilePath) {
    // Get the directory where this script is located and construct the default path to i18n.config.js
    const scriptDir = path.dirname(__filename); // Get the directory where i18n-tool.js is located
    configFilePath = path.join(scriptDir, 'i18n.config.js');
    console.log(`No configuration file specified, using default path: ${configFilePath}`);
}

// Check if the configuration file exists
if (!fs.existsSync(configFilePath)) {
    console.error(`Configuration file ${configFilePath} does not exist. Please check the path or use the --config option to specify the config file.`);
    process.exit(1);
}

// Load the configuration file
let userConfig = require(path.resolve(configFilePath));

// Get the debug mode configuration
const debugMode = userConfig.debug;

// Define a log function that only prints logs in debug mode
const log = (...args) => {
    if (debugMode) {
        console.log(...args);
    }
};

// Store the log of operations
let actionsLog = [];
let filesProcessed = 0; // To track the total number of processed files
let directoryFileCount = {}; // To record the number of files processed in each directory

log('Current configuration:', userConfig);

// Validate the user input parameters
const validateConfig = (config) => {
    if (!config.locales || (config.singleFile.length === 0 && config.directories.length === 0)) {
        console.error('The locales file path must be specified, and at least one singleFile or directories must be provided.');
        process.exit(1);
    }
    if (config.directories.length > 0 && config.excludeFiles.some(file => !config.directories.some(dir => file.startsWith(dir)))) {
        console.error('The files or directories to be excluded must be sub-items of the specified directories.');
        process.exit(1);
    }
};

// Validate the locales file path
if (!fs.existsSync(userConfig.locales)) {
    console.error(`File path ${userConfig.locales} is invalid or does not exist.`);
    process.exit(1);
} else {
    log(`Locales file path: ${userConfig.locales} is valid`);
}

// Execute the i18n process
const executeI18nProcess = async (filePath, localesPath) => {
    try {
        log(`Processing file: ${filePath}`);
        const tsxCode = fs.readFileSync(filePath, 'utf8');
        const { ast, CNpath, i18nMap, i18nImported } = processAST(tsxCode, debugMode);

        if (CNpath.length > 0) {
            log(`Identified Chinese text paths: ${CNpath.map(item => item.value).join(', ')}`);
            const transformedCode = generateCode(ast, i18nImported, CNpath);
            fs.writeFileSync(filePath, transformedCode, 'utf8');
            log(`Processed successfully: ${filePath}`);
            
            // Record the operation log
            actionsLog.push(`Processed file: ${filePath}, identified ${CNpath.length} Chinese texts`);

            // Save the i18nMap to the locales file
            const existingData = JSON.parse(fs.readFileSync(localesPath, 'utf8'));
            const updatedData = { ...existingData, ...i18nMap };
            updateLocalesFile(localesPath, updatedData, debugMode);
            log('Locales file updated');
            actionsLog.push(`Updated locales file: ${localesPath}`);
        } else {
            log(`No changes or Chinese text found in the file: ${filePath}`);
            actionsLog.push(`No changes: ${filePath}`);
        }
        filesProcessed++; // Increment the counter for each processed file
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
    }
};

// Execute the translation process
const executeTranslateProcess = async () => {
    log('Starting the translation process...');
    if (userConfig.locales) {
        bindFilePaths(userConfig.locales); // Ensure the locales file path is valid
        bindAPIInfo(userConfig.api, userConfig.targetLanguage); // Bind the API configuration and pass the target language
        await translateAndSave(); // Execute translation and save the result

        // Increment the file processing counter and log the operation
        filesProcessed++; // The translation process counts as processing a file
        actionsLog.push(`Translated and saved the locales file: ${userConfig.locales}`);
    } else {
        console.error('Please bind the locales file path');
        process.exit(1);
    }
};

// Process all files in the specified directories
const processDirectories = async (directories, excludeFiles, localesPath) => {
    for (const directory of directories) {
        log(`Processing directory: ${directory}`);
        await findFiles(directory, excludeFiles, async (files) => {
            if (files.length > 0) {
                log(`Found files: ${files.join(', ')}`);
                let directoryProcessedCount = 0;
                for (const file of files) {
                    await executeI18nProcess(file, localesPath);
                    directoryProcessedCount++;
                }
                // Record the number of files processed in each directory
                directoryFileCount[directory] = directoryProcessedCount;
                actionsLog.push(`Processed directory: ${directory}, total files processed: ${directoryProcessedCount}`);
            } else {
                log(`No files to process`);
                directoryFileCount[directory] = 0;
                actionsLog.push(`No files found in directory: ${directory}`);
            }
        });
    }
};

// Process multiple individual files
const processFiles = async (files, localesPath) => {
    for (const file of files) {
        log(`Processing single file: ${file}`);
        await executeI18nProcess(file, localesPath);
    }
    actionsLog.push(`Processed ${files.length} single files`);
};

// Validate and load the configuration file
validateConfig(userConfig);

// Execute i18n and translation operations
const run = async () => {
    if (userConfig.processFile) {
        // Process individual files
        if (userConfig.singleFile.length > 0) {
            await processFiles(userConfig.singleFile, userConfig.locales);
        }
        // Process directories
        if (userConfig.directories.length > 0) {
            await processDirectories(userConfig.directories, userConfig.excludeFiles, userConfig.locales);
        }
    }

    if (userConfig.translate) {
        await executeTranslateProcess();
    }

    // Output summary logs
    console.log('Operation summary:');
    console.log(`i18n processed ${userConfig.singleFile.length} single files`);
    Object.keys(directoryFileCount).forEach((directory) => {
        console.log(`Processed directory: ${directory}, total i18n processed files: ${directoryFileCount[directory]}`);
    });
    console.log(`Total files processed: ${filesProcessed}`);
};

// Run the main function
run().catch((error) => {
    console.error('Error occurred during execution:', error);
});