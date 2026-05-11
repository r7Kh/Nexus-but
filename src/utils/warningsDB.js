const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../database/warnings.json');

function readData() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}');
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function addWarning(userId, warning) {
    const data = readData();

    if (!data[userId]) data[userId] = [];

    data[userId].push(warning);
    saveData(data);
}

function getWarnings(userId) {
    const data = readData();
    return data[userId] || [];
}

function removeWarning(userId, index) {
    const data = readData();

    if (!data[userId]) return false;

    data[userId].splice(index, 1);
    saveData(data);

    return true;
}

module.exports = {
    addWarning,
    getWarnings,
    removeWarning
};