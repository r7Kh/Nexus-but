const mafiaLobbies = new Map();

function createLobby(channelId, host) {
    const lobby = {
        channelId,
        hostId: host.id,
        hostTag: host.tag,
        players: [
            {
                id: host.id,
                tag: host.tag
            }
        ],
        status: 'WAITING',
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000
    };

    mafiaLobbies.set(channelId, lobby);
    return lobby;
}

function getLobby(channelId) {
    const lobby = mafiaLobbies.get(channelId);

    if (!lobby) return null;

    if (Date.now() > lobby.expiresAt && lobby.status === 'WAITING') {
        mafiaLobbies.delete(channelId);
        return null;
    }

    return lobby;
}

function deleteLobby(channelId) {
    mafiaLobbies.delete(channelId);
}

function addPlayer(channelId, user) {
    const lobby = getLobby(channelId);
    if (!lobby) return null;

    if (lobby.players.some(player => player.id === user.id)) {
        return lobby;
    }

    lobby.players.push({
        id: user.id,
        tag: user.tag
    });

    mafiaLobbies.set(channelId, lobby);
    return lobby;
}

function removePlayer(channelId, userId) {
    const lobby = getLobby(channelId);
    if (!lobby) return null;

    lobby.players = lobby.players.filter(player => player.id !== userId);

    mafiaLobbies.set(channelId, lobby);
    return lobby;
}

module.exports = {
    createLobby,
    getLobby,
    deleteLobby,
    addPlayer,
    removePlayer
};