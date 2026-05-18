const MafiaLobby = require('../models/MafiaLobby');
const MafiaGame = require('../models/MafiaGame');

const timers = new Map();

async function createLobby(channelId, host) {
    await MafiaLobby.deleteOne({ channelId });

    return await MafiaLobby.create({
        channelId,
        hostId: host.id,
        hostTag: host.tag,
        players: [
            {
                id: host.id,
                tag: host.tag
            }
        ],
        status: 'WAITING'
    });
}

async function getLobby(channelId) {
    return await MafiaLobby.findOne({ channelId });
}

async function deleteLobby(channelId) {
    await MafiaLobby.deleteOne({ channelId });
}

async function addPlayer(channelId, user) {
    const lobby = await getLobby(channelId);
    if (!lobby) return null;

    const exists = lobby.players.some(p => p.id === user.id);

    if (!exists) {
        lobby.players.push({
            id: user.id,
            tag: user.tag
        });

        await lobby.save();
    }

    return lobby;
}

async function removePlayer(channelId, userId) {
    const lobby = await getLobby(channelId);
    if (!lobby) return null;

    lobby.players = lobby.players.filter(p => p.id !== userId);

    await lobby.save();

    return lobby;
}

async function createGame(game) {
    await MafiaGame.deleteOne({ id: game.id });

    const safeGame = {
        ...game,
        responded: Array.from(game.responded || [])
    };

    delete safeGame.timer;

    return await MafiaGame.create(safeGame);
}

async function getGame(gameId) {
    const game = await MafiaGame.findOne({ id: gameId });
    if (!game) return null;

    return {
        ...game.toObject(),
        responded: new Set(game.responded || [])
    };
}

async function setGame(gameId, game) {
    const safeGame = {
        ...game,
        responded: Array.from(game.responded || [])
    };

    delete safeGame._id;
    delete safeGame.__v;
    delete safeGame.createdAt;
    delete safeGame.updatedAt;
    delete safeGame.timer;

    await MafiaGame.updateOne(
        { id: gameId },
        { $set: safeGame },
        { upsert: true }
    );
}

async function deleteGame(gameId) {
    const timer = timers.get(gameId);

    if (timer) {
        clearTimeout(timer);
        timers.delete(gameId);
    }

    await MafiaGame.deleteOne({ id: gameId });
}

async function getGameByChannel(channelId) {
    const game = await MafiaGame.findOne({ channelId });
    if (!game) return null;

    return {
        ...game.toObject(),
        responded: new Set(game.responded || [])
    };
}

function setTimer(gameId, timer) {
    const oldTimer = timers.get(gameId);

    if (oldTimer) {
        clearTimeout(oldTimer);
    }

    timers.set(gameId, timer);
}

function clearTimer(gameId) {
    const timer = timers.get(gameId);

    if (timer) {
        clearTimeout(timer);
        timers.delete(gameId);
    }
}

module.exports = {
    createLobby,
    getLobby,
    deleteLobby,
    addPlayer,
    removePlayer,
    createGame,
    getGame,
    setGame,
    deleteGame,
    getGameByChannel,
    setTimer,
    clearTimer
};