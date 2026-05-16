const sessionsByUser = new Map();
const sessionsByMessage = new Map();

let globalEvent = null;

function createSession({ userId, channelId, messageId = null, type = 'hub' }) {
    const oldSession = sessionsByUser.get(userId);

    if (oldSession?.messageId) {
        sessionsByMessage.delete(oldSession.messageId);
    }

    const session = {
        userId,
        channelId,
        messageId,
        type,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    sessionsByUser.set(userId, session);

    if (messageId) {
        sessionsByMessage.set(messageId, session);
    }

    return session;
}

function attachMessage(userId, messageId) {
    const session = sessionsByUser.get(userId);
    if (!session) return null;

    if (session.messageId) {
        sessionsByMessage.delete(session.messageId);
    }

    session.messageId = messageId;
    session.updatedAt = Date.now();

    sessionsByUser.set(userId, session);
    sessionsByMessage.set(messageId, session);

    return session;
}

function getUserSession(userId) {
    return sessionsByUser.get(userId) || null;
}

function getMessageSession(messageId) {
    return sessionsByMessage.get(messageId) || null;
}

function clearUserSession(userId) {
    const session = sessionsByUser.get(userId);

    if (session?.messageId) {
        sessionsByMessage.delete(session.messageId);
    }

    sessionsByUser.delete(userId);
}

function clearMessageSession(messageId) {
    const session = sessionsByMessage.get(messageId);

    if (session) {
        sessionsByUser.delete(session.userId);
    }

    sessionsByMessage.delete(messageId);
}

function clearAllSessions() {
    const count = sessionsByUser.size;

    sessionsByUser.clear();
    sessionsByMessage.clear();

    return count;
}

function getSessionsCount() {
    return sessionsByUser.size;
}

function isOwner(userId, messageId) {
    const session = getMessageSession(messageId);
    return session && session.userId === userId;
}

function setGlobalEvent(event) {
    globalEvent = event;
}

function getGlobalEvent() {
    if (!globalEvent) return null;

    if (globalEvent.expiresAt && Date.now() > globalEvent.expiresAt) {
        globalEvent = null;
        return null;
    }

    return globalEvent;
}

module.exports = {
    createSession,
    attachMessage,
    getUserSession,
    getMessageSession,
    clearUserSession,
    clearMessageSession,
    clearAllSessions,
    getSessionsCount,
    isOwner,
    setGlobalEvent,
    getGlobalEvent
};