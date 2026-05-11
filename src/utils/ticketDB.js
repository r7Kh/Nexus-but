const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../database/tickets.json');

function readData() {
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
        ...ticket,
        status: 'OPEN',
        claimedBy: null,
        claimedById: null,
        claimedAt: null,
        closedBy: null,
        closedById: null,
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

function findTicketByChannel(channelName) {
    const data = readData();
    return data.tickets.find(ticket => channelName === `ticket-${ticket.id}`);
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
    updateTicket
};