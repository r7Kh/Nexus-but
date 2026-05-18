const mongoose = require('mongoose');

const mafiaGameSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    hostId: { type: String, required: true },

    players: {
        type: Array,
        default: []
    },

    phase: {
        type: String,
        default: 'STARTING'
    },

    actions: {
        type: Object,
        default: {}
    },

    votes: {
        type: Object,
        default: {}
    },

    responded: {
        type: Array,
        default: []
    },

    resolved: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('MafiaGame', mafiaGameSchema);