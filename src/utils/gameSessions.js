const GameSession = require('../models/GameSession');
const GlobalEvent = require('../models/GlobalEvent');

let globalEventTimeout = null;

async function createSession({
    userId,
    channelId,
    messageId = null,
    type = 'hub',
    data = {},
    expiresAt = null
}) {

    await GameSession.deleteMany({
        userId
    });

    return await GameSession.create({
        userId,
        channelId,
        messageId,
        type,
        data,
        expiresAt
    });
}

async function attachMessage(userId, messageId) {
    const session = await GameSession.findOne({
        userId
    });

    if (!session) return null;

    session.messageId = messageId;

    await session.save();

    return session;
}

async function getUserSession(userId) {
    return await GameSession.findOne({
        userId
    });
}

async function getMessageSession(messageId) {
    return await GameSession.findOne({
        messageId
    });
}

async function clearUserSession(userId) {
    await GameSession.deleteMany({
        userId
    });
}

async function clearMessageSession(messageId) {
    await GameSession.deleteMany({
        messageId
    });
}

async function clearAllSessions() {
    const count = await GameSession.countDocuments();

    await GameSession.deleteMany({});

    return count;
}

async function getSessionsCount() {
    return await GameSession.countDocuments();
}

async function isOwner(userId, messageId) {
    const session = await getMessageSession(messageId);

    return session && session.userId === userId;
}

async function setGlobalEvent(event) {
    await GlobalEvent.deleteMany({});

    return await GlobalEvent.create(event);
}

async function getGlobalEvent() {
    const event = await GlobalEvent.findOne({
        active: true
    });

    if (!event) return null;

    if (
        event.expiresAt &&
        Date.now() > new Date(event.expiresAt).getTime()
    ) {
        await GlobalEvent.deleteMany({});
        return null;
    }

    return event;
}

async function clearGlobalEvent() {
    await GlobalEvent.deleteMany({});

    if (globalEventTimeout) {
        clearTimeout(globalEventTimeout);
        globalEventTimeout = null;
    }
}

function setGlobalEventTimeout(timeout) {
    if (globalEventTimeout) {
        clearTimeout(globalEventTimeout);
    }

    globalEventTimeout = timeout;
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
    getGlobalEvent,
    clearGlobalEvent,
    setGlobalEventTimeout
};