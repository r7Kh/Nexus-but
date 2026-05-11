require('dotenv').config();

const { Client, Collection, GatewayIntentBits } = require('discord.js');

const commandHandler = require('./handlers/commandHandler');
const slashCommandHandler = require('./handlers/slashCommandHandler');
const eventHandler = require('./handlers/eventHandler');
const initDatabase = require('./utils/initDatabase');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.commands = new Collection();
client.slashCommands = new Collection();

initDatabase();

commandHandler(client);
slashCommandHandler(client);
eventHandler(client);

client.login(process.env.TOKEN);