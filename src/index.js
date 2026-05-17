require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection
} = require('discord.js');

const mongoose = require('mongoose');

const loadSlashCommands = require('./handlers/slashCommandHandler');
const loadEvents = require('./handlers/eventHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

client.commands = new Collection();

process.on('unhandledRejection', error => {
    console.error('[UNHANDLED REJECTION]', error);
});

process.on('uncaughtException', error => {
    console.error('[UNCAUGHT EXCEPTION]', error);
});

async function connectDatabase() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI غير موجود داخل Environment Variables');
    }

    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 30000
    });

    console.log('✅ قاعدة البيانات جاهزة');
}

async function startBot() {
    try {
        await connectDatabase();

        await loadSlashCommands(client);
        await loadEvents(client);

        if (!process.env.TOKEN) {
            throw new Error('TOKEN غير موجود داخل Environment Variables');
        }

        await client.login(process.env.TOKEN);

        console.log('✅ Discord client login successful');

    } catch (error) {
        console.error('❌ Startup Error:', error);
        process.exit(1);
    }
}

startBot();