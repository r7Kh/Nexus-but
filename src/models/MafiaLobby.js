const mongoose = require('mongoose');

const mafiaLobbySchema = new mongoose.Schema({
    channelId: { type: String, required: true, unique: true },
    hostId: { type: String, required: true },
    hostTag: { type: String, required: true },
    players: {
        type: Array,
        default: []
    },
    status: {
        type: String,
        default: 'WAITING'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('MafiaLobby', mafiaLobbySchema);