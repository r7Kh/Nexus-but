const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '../database/logs.json');

function readLogs() {
    if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '[]');
    }

    return JSON.parse(fs.readFileSync(logPath));
}

function saveLogs(logs) {
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

function addLog(action, moderator, target, reason) {
    const logs = readLogs();

    logs.push({
        action,
        moderator,
        target,
        reason,
        date: new Date().toLocaleString()
    });

    saveLogs(logs);
}

module.exports = {
    addLog
};