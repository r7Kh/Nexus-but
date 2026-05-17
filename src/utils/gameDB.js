const fs = require('fs');
const path = require('path');

const achievements = require('../data/achievements');
const gameSessions = require('./gameSessions');

const filePath = path.join(__dirname, '../database/games.json');

function ensureFile() {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({ players: {} }, null, 2));
    }
}

function readData() {
    ensureFile();
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function createDefaultPlayer(user) {
    return {
        userId: user.id,
        username: user.tag || user.username || 'Unknown',
        coins: 100,
        xp: 0,
        level: 1,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        streak: 0,
        dailyStreak: 0,
        lastDaily: null,
        inventory: [],
        badges: [],
        activeBoosts: {
            xpMultiplier: 1,
            coinShield: false
        }
    };
}

function normalizePlayer(player, user) {
    const defaultPlayer = createDefaultPlayer(user);

    return {
        ...defaultPlayer,
        ...player,
        username: user.tag || user.username || player.username || 'Unknown',
        activeBoosts: {
            ...defaultPlayer.activeBoosts,
            ...(player.activeBoosts || {})
        },
        inventory: Array.isArray(player.inventory) ? player.inventory : [],
        badges: Array.isArray(player.badges) ? player.badges : []
    };
}

function checkAchievements(player) {
    const unlocked = [];
    const badges = Array.isArray(player.badges)
        ? [...player.badges]
        : [];

    for (const achievement of achievements) {
        if (
            !badges.includes(achievement.name) &&
            achievement.check(player)
        ) {
            badges.push(achievement.name);
            unlocked.push(achievement);
        }
    }

    player.badges = badges;

    return unlocked;
}

function getPlayer(user) {
    const data = readData();

    if (!data.players[user.id]) {
        data.players[user.id] = createDefaultPlayer(user);
        saveData(data);
    }

    data.players[user.id] = normalizePlayer(
        data.players[user.id],
        user
    );

    checkAchievements(data.players[user.id]);

    saveData(data);

    return data.players[user.id];
}

function updatePlayer(user, updates) {
    const data = readData();

    if (!data.players[user.id]) {
        data.players[user.id] = createDefaultPlayer(user);
    }

    data.players[user.id] = normalizePlayer({
        ...data.players[user.id],
        ...updates
    }, user);

    checkAchievements(data.players[user.id]);

    saveData(data);

    return data.players[user.id];
}

async function addReward(user, {
    coins = 0,
    xp = 0,
    win = false,
    loss = false
}) {

    const player = getPlayer(user);

    const activeEvent =
        await gameSessions.getGlobalEvent();

    const eventMultiplier =
        activeEvent?.active
            ? activeEvent.multiplier || 1
            : 1;

    const xpMultiplier =
        player.activeBoosts?.xpMultiplier || 1;

    const finalXP = Math.floor(
        xp * xpMultiplier * eventMultiplier
    );

    let finalCoins = Math.floor(
        coins * eventMultiplier
    );

    if (coins < 0) {
        finalCoins = coins;
    }

    if (
        coins < 0 &&
        player.activeBoosts?.coinShield
    ) {
        finalCoins = 0;
        player.activeBoosts.coinShield = false;
    }

    const newXP = player.xp + finalXP;

    const newLevel =
        Math.floor(newXP / 100) + 1;

    const updatedPlayer = updatePlayer(user, {
        coins: Math.max(
            0,
            player.coins + finalCoins
        ),

        xp: newXP,

        level: newLevel,

        wins:
            player.wins + (win ? 1 : 0),

        losses:
            player.losses + (loss ? 1 : 0),

        gamesPlayed:
            player.gamesPlayed + 1,

        streak:
            win
                ? player.streak + 1
                : 0,

        activeBoosts:
            player.activeBoosts
    });

    return updatedPlayer;
}

function canClaimDaily(user) {
    const player = getPlayer(user);

    if (!player.lastDaily) {
        return {
            canClaim: true,
            remaining: 0
        };
    }

    const now = Date.now();

    const last =
        new Date(player.lastDaily).getTime();

    const cooldown =
        24 * 60 * 60 * 1000;

    const diff = now - last;

    if (diff >= cooldown) {
        return {
            canClaim: true,
            remaining: 0
        };
    }

    return {
        canClaim: false,
        remaining: Math.ceil(
            (cooldown - diff) / 1000
        )
    };
}

function claimDaily(user) {
    const player = getPlayer(user);

    const check = canClaimDaily(user);

    if (!check.canClaim) {
        return {
            claimed: false,
            remaining: check.remaining,
            player
        };
    }

    const now = Date.now();

    const last =
        player.lastDaily
            ? new Date(player.lastDaily).getTime()
            : 0;

    const twoDays =
        48 * 60 * 60 * 1000;

    const newDailyStreak =
        last && now - last <= twoDays
            ? player.dailyStreak + 1
            : 1;

    const baseCoins = 150;

    const streakBonus =
        Math.min(newDailyStreak * 25, 250);

    const xp = 50;

    const coins =
        baseCoins + streakBonus;

    const updatedPlayer =
        updatePlayer(user, {
            coins:
                player.coins + coins,

            xp:
                player.xp + xp,

            level:
                Math.floor(
                    (player.xp + xp) / 100
                ) + 1,

            dailyStreak:
                newDailyStreak,

            lastDaily:
                new Date().toISOString()
        });

    return {
        claimed: true,
        coins,
        xp,
        streak: newDailyStreak,
        player: updatedPlayer
    };
}

function buyItem(user, item) {
    const player = getPlayer(user);

    if (player.coins < item.price) {
        return {
            success: false,
            reason: 'NOT_ENOUGH_COINS',
            player
        };
    }

    const inventory = [
        ...player.inventory,
        {
            id: item.id,
            name: item.name,
            boughtAt:
                new Date().toISOString()
        }
    ];

    const badges = [...player.badges];

    const activeBoosts = {
        ...player.activeBoosts
    };

    if (
        item.type === 'badge' &&
        !badges.includes(item.name)
    ) {
        badges.push(item.name);
    }

    if (item.type === 'xp_boost') {
        activeBoosts.xpMultiplier = 2;
    }

    if (item.type === 'coin_shield') {
        activeBoosts.coinShield = true;
    }

    const updatedPlayer =
        updatePlayer(user, {
            coins:
                player.coins - item.price,

            inventory,

            badges,

            activeBoosts
        });

    return {
        success: true,
        player: updatedPlayer
    };
}

function getLeaderboard(type = 'coins') {
    const data = readData();

    return Object.values(
        data.players || {}
    )
        .sort(
            (a, b) =>
                (b[type] || 0) -
                (a[type] || 0)
        )
        .slice(0, 10);
}

module.exports = {
    getPlayer,
    updatePlayer,
    addReward,
    getLeaderboard,
    canClaimDaily,
    claimDaily,
    buyItem,
    checkAchievements
};