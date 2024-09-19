const fg = require('fast-glob');

async function findFiles(directory, excludePaths, callback, debugMode) {
    const log = (...args) => {
        if (debugMode) {
            console.log(...args);
        }
    };

    const pattern = `${directory}/**/*.{tsx,ts,js}`; 
    log(`Using match pattern: ${pattern}`);
    
    try {
        const files = await fg(pattern, {
            ignore: excludePaths,  // Exclude paths that are not to be processed
            absolute: true         // Return absolute paths of the matched files
        });

        log(`Number of matched files: ${files.length}`);
        log(`All matched files: ${files.join(', ')}`);

        callback(files);  // Pass the matched files to the callback function
    } catch (err) {
        console.error('Error occurred while searching for files:', err);
    }
}

module.exports = { findFiles };