const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../database/games.json');

function ensureFile() {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(
            filePath,
            JSON.stringify({ players: {} }, null, 2)
        );
    }
}

function readData() {
    ensureFile();
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getPlayer(user) {
    const data = readData();

    if (!data.players[user.id]) {
        data.players[user.id] = {
            userId: user.id,
            username: user.tag,
            coins: 100,
            xp: 0,
            level: 1,
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            streak: 0
        };

        saveData(data);
    }

    return data.players[user.id];
}

function updatePlayer(user, updates) {
    const data = readData();

    if (!data.players[user.id]) {
        getPlayer(user);
    }

    data.players[user.id] = {
        ...data.players[user.id],
        ...updates,
        username: user.tag
    };

    saveData(data);
    return data.players[user.id];
}

function addReward(user, { coins = 0, xp = 0, win = false, loss = false }) {
    const player = getPlayer(user);

    const newXP = player.xp + xp;
    const newLevel = Math.floor(newXP / 100) + 1;

    return updatePlayer(user, {
        coins: Math.max(0, player.coins + coins),
        xp: newXP,
        level: newLevel,
        wins: player.wins + (win ? 1 : 0),
        losses: player.losses + (loss ? 1 : 0),
        gamesPlayed: player.gamesPlayed + 1,
        streak: win ? player.streak + 1 : 0
    });
}

function getLeaderboard() {
    const data = readData();

    return Object.values(data.players)
        .sort((a, b) => b.coins - a.coins)
        .slice(0, 10);
}

module.exports = {
    getPlayer,
    updatePlayer,
    addReward,
    getLeaderboard
};