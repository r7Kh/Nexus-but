require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits
} = require('discord.js');

const logger = require('./utils/logger');
const handleErrors = require('./utils/handleErrors');

const slashCommandHandler = require('./handlers/slashCommandHandler');
const eventHandler = require('./handlers/eventHandler');
const initDatabase = require('./utils/initDatabase');

handleErrors();

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

client.once('clientReady', () => {
    logger.info(`NEXUS BOT ONLINE AS ${client.user.tag}`);
    console.log(`✅ NEXUS BOT ONLINE AS ${client.user.tag}`);
});

initDatabase();

slashCommandHandler(client);
eventHandler(client);

client.login(process.env.TOKEN)
    .then(() => {
        logger.info('Discord client login successful');
    })
    .catch((error) => {
        logger.error(`Discord client login failed: ${error.stack || error}`);
    });