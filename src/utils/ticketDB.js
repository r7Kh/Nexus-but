const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../database/tickets.json');

function readData() {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(
            filePath,
            JSON.stringify({ counter: 0, tickets: [] }, null, 2)
        );
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function createTicket(ticket) {
    const data = readData();

    data.counter += 1;

    const ticketNumber = String(data.counter).padStart(3, '0');

    const newTicket = {
        id: ticketNumber,
        channelName: ticket.channelName || null,
        channelId: ticket.channelId || null,
        ...ticket,
        status: 'OPEN',
        claimedBy: null,
        claimedById: null,
        claimedAt: null,
        closedBy: null,
        closedById: null,
        closeReason: null,
        closedAt: null,
        rating: null,
        ratingBy: null,
        ratingById: null,
        ratingAt: null,
        logMessageId: null,
        transcript: [],
        createdAt: new Date().toLocaleString()
    };

    data.tickets.push(newTicket);
    saveData(data);

    return newTicket;
}

function getTicketIdFromChannelName(channelName) {
    if (!channelName) return null;

    const match = channelName.match(/(?:ticket|player|admin|support|role)-(\d{3,})$/);

    if (!match) return null;

    return match[1];
}

function findTicketByChannel(channelName, channelId = null) {
    const data = readData();

    if (channelId) {
        const byChannelId = data.tickets.find(ticket => ticket.channelId === channelId);
        if (byChannelId) return byChannelId;
    }

    const ticketId = getTicketIdFromChannelName(channelName);

    if (!ticketId) return null;

    return data.tickets.find(ticket => ticket.id === ticketId);
}

function updateTicket(ticketId, updates) {
    const data = readData();

    const ticket = data.tickets.find(ticket => ticket.id === ticketId);
    if (!ticket) return null;

    Object.assign(ticket, updates);

    saveData(data);
    return ticket;
}

module.exports = {
    readData,
    saveData,
    createTicket,
    findTicketByChannel,
    updateTicket,
    getTicketIdFromChannelName
};