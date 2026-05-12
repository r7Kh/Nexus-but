const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../database/staffStats.json');

function ensureFile() {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({ staff: {} }, null, 4));
    }
}

function readData() {
    ensureFile();

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeData(data) {
    ensureFile();

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

function getWeekKey() {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

    return `${now.getFullYear()}-W${weekNumber}`;
}

function ensureStaff(data, userId) {
    const weekKey = getWeekKey();

    if (!data.staff[userId]) {
        data.staff[userId] = {};
    }

    if (!data.staff[userId][weekKey]) {
        data.staff[userId][weekKey] = {
            messages: 0,
            ticketsClaimed: 0,
            voiceMs: 0,
            voiceJoinAt: null
        };
    }

    return data.staff[userId][weekKey];
}

function addMessage(userId) {
    const data = readData();
    const stats = ensureStaff(data, userId);

    stats.messages += 1;

    writeData(data);
}

function addTicketClaim(userId) {
    const data = readData();
    const stats = ensureStaff(data, userId);

    stats.ticketsClaimed += 1;

    writeData(data);
}

function startVoice(userId) {
    const data = readData();
    const stats = ensureStaff(data, userId);

    if (!stats.voiceJoinAt) {
        stats.voiceJoinAt = Date.now();
    }

    writeData(data);
}

function stopVoice(userId) {
    const data = readData();
    const stats = ensureStaff(data, userId);

    if (stats.voiceJoinAt) {
        stats.voiceMs += Date.now() - stats.voiceJoinAt;
        stats.voiceJoinAt = null;
    }

    writeData(data);
}

function getCurrentWeekStats() {
    const data = readData();
    const weekKey = getWeekKey();

    const result = [];

    for (const userId of Object.keys(data.staff)) {
        const stats = data.staff[userId][weekKey];

        if (!stats) continue;

        let voiceMs = stats.voiceMs;

        if (stats.voiceJoinAt) {
            voiceMs += Date.now() - stats.voiceJoinAt;
        }

        result.push({
            userId,
            messages: stats.messages || 0,
            ticketsClaimed: stats.ticketsClaimed || 0,
            voiceMs
        });
    }

    return result;
}

module.exports = {
    addMessage,
    addTicketClaim,
    startVoice,
    stopVoice,
    getCurrentWeekStats
};