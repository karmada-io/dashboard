const fs = require('fs');

function updateLocalesFile(localesPath, newEntries, debugMode) {
    const log = (...args) => {
        if (debugMode) {
            console.log(...args);
        }
    };

    // Check if the locales file exists
    if (!fs.existsSync(localesPath)) {
        console.error(`File ${localesPath} does not exist`);
        process.exit(1);
    }

    // Read the existing data from the locales file
    const existingData = JSON.parse(fs.readFileSync(localesPath, 'utf8'));
    const updatedData = { ...existingData };

    // Add new entries only if the key doesn't already exist
    Object.keys(newEntries).forEach((key) => {
        if (!existingData[key]) {
            updatedData[key] = newEntries[key]; 
        } else {
            log(`Key ${key} already exists, skipping addition`);
        }
    });

    // Write the updated data back to the locales file
    fs.writeFileSync(localesPath, JSON.stringify(updatedData, null, 2), 'utf8');
    log(`Updated ${localesPath}`);
}

module.exports = { updateLocalesFile };