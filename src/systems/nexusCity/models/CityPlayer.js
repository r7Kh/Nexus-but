const mongoose = require('mongoose');

const cityPlayerSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },

    discordTag: {
        type: String,
        required: true
    },

    characterName: {
        type: String,
        required: true
    },

    age: {
        type: Number,
        required: true
    },

    nationality: {
        type: String,
        default: 'Unknown'
    },

    story: {
        type: String,
        default: 'No story'
    },

    faction: {
        type: String,
        default: 'Civilian'
    },

    factionRank: {
        type: String,
        default: 'Citizen'
    },

    nexusDollars: {
        type: Number,
        default: 500
    },

    bank: {
        type: Number,
        default: 0
    },

    xp: {
        type: Number,
        default: 0
    },

    level: {
        type: Number,
        default: 1
    },

    wantedLevel: {
        type: Number,
        default: 0
    },

    weapons: {
        type: Array,
        default: []
    },

    vehicles: {
        type: Array,
        default: []
    },

    inventory: {
        type: Array,
        default: []
    },

    fines: {
        type: Array,
        default: []
    },

    criminalRecord: {
        type: Array,
        default: []
    },

    inDuty: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.models.CityPlayer || mongoose.model('CityPlayer', cityPlayerSchema);