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

    gender: {
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
        default: 'None'
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

    prestige: {
        type: Number,
        default: 0
    },

    reputation: {
        type: Number,
        default: 0
    },

    wantedLevel: {
        type: Number,
        default: 0
    },

    dutyHours: {
        type: Number,
        default: 0
    },

    inventory: {
        type: Array,
        default: []
    },

    weapons: {
        type: Array,
        default: []
    },

    vehicles: {
        type: Array,
        default: []
    },

    selectedWeapon: {
        type: String,
        default: null
    },

    selectedVehicle: {
        type: String,
        default: null
    },

    licenses: {
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

    isDead: {
        type: Boolean,
        default: false
    },

    isInjured: {
        type: Boolean,
        default: false
    },

    inDuty: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('CityPlayer', cityPlayerSchema);