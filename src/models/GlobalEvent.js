const mongoose = require('mongoose');

const globalEventSchema = new mongoose.Schema({
    active: {
        type: Boolean,
        default: false
    },

    game: {
        type: String,
        default: 'all'
    },

    gameName: {
        type: String,
        default: 'All Games'
    },

    multiplier: {
        type: Number,
        default: 1
    },

    startedBy: {
        type: String,
        default: null
    },

    startedAt: {
        type: Date,
        default: Date.now
    },

    expiresAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('GlobalEvent', globalEventSchema);