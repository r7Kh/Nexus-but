const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },

    channelId: {
        type: String,
        required: true
    },

    messageId: {
        type: String,
        default: null
    },

    type: {
        type: String,
        default: 'hub'
    },

    data: {
        type: Object,
        default: {}
    },

    expiresAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('GameSession', gameSessionSchema);