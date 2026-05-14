const mafiaLobbies = new Map();
const mafiaGames = new Map();

function createLobby(channelId, host) {
    const lobby = {
        channelId,
        hostId: host.id,
        hostTag: host.tag,
        players: [{ id: host.id, tag: host.tag }],
        status: 'WAITING',
        createdAt: Date.now()
    };

    mafiaLobbies.set(channelId, lobby);
    return lobby;
}

function getLobby(channelId) {
    return mafiaLobbies.get(channelId) || null;
}

function deleteLobby(channelId) {
    mafiaLobbies.delete(channelId);
}

function addPlayer(channelId, user) {
    const lobby = getLobby(channelId);
    if (!lobby) return null;

    if (!lobby.players.some(p => p.id === user.id)) {
        lobby.players.push({ id: user.id, tag: user.tag });
    }

    return lobby;
}

function removePlayer(channelId, userId) {
    const lobby = getLobby(channelId);
    if (!lobby) return null;

    lobby.players = lobby.players.filter(p => p.id !== userId);
    return lobby;
}

function createGame(game) {
    mafiaGames.set(game.id, game);
    return game;
}

function getGame(gameId) {
    return mafiaGames.get(gameId) || null;
}

function setGame(gameId, game) {
    mafiaGames.set(gameId, game);
}

function deleteGame(gameId) {
    const game = mafiaGames.get(gameId);
    if (game?.timer) clearTimeout(game.timer);
    mafiaGames.delete(gameId);
}

function getGameByChannel(channelId) {
    return [...mafiaGames.values()].find(g => g.channelId === channelId) || null;
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
    getGameByChannel
};