const activeSessions = new Map();

function getSession(channelId) {
    const session = activeSessions.get(channelId);

    if (!session) return null;

    if (Date.now() > session.expiresAt) {
        activeSessions.delete(channelId);
        return null;
    }

    return session;
}

function setSession(channelId, data) {
    activeSessions.set(channelId, {
        ...data,
        startedAt: Date.now(),
        expiresAt: Date.now() + (data.duration || 120000)
    });
}

function clearSession(channelId) {
    activeSessions.delete(channelId);
}

function hasActiveSession(channelId) {
    return Boolean(getSession(channelId));
}

module.exports = {
    getSession,
    setSession,
    clearSession,
    hasActiveSession
};