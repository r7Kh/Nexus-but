require('dotenv').config();

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const ffmpegPath = require('ffmpeg-static');

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

client.distube = new DisTube(client, {
    emitNewSongOnly: true,
    ffmpeg: {
        path: ffmpegPath
    }
});

client.distube
    .on('playSong', (queue, song) => {
        queue.textChannel?.send(
            `🎶 الآن يتم تشغيل: **${song.name}**`
        );
    })

    .on('addSong', (queue, song) => {
        queue.textChannel?.send(
            `➕ تمت إضافة: **${song.name}**`
        );
    })

    .on('error', (channel, error) => {
        console.log('PLAY ERROR FULL:', error);

        logger.error(`DisTube Error: ${error.stack || error}`);

        channel?.send(
            `❌ فشل تشغيل الأغنية.\n\n${error.message}`
        ).catch(() => {});
    });

initDatabase();

slashCommandHandler(client);
eventHandler(client);

client.login(process.env.TOKEN)
    .then(() => {
        logger.info('Discord client login successful');
    })
    .catch((error) => {
        logger.error(
            `Discord client login failed: ${error.stack || error}`
        );
    });