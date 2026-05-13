require('dotenv').config();

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YouTubePlugin } = require('@distube/youtube');
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
    },
    plugins: [
        new YouTubePlugin({
            cookies: process.env.YT_COOKIE || undefined
        })
    ]
});

client.distube
    .on('playSong', (queue, song) => {
        queue.textChannel?.send(
            `🎶 الآن يتم تشغيل: **${song.name}**`
        ).catch(() => {});
    })

    .on('addSong', (queue, song) => {
        queue.textChannel?.send(
            `➕ تمت إضافة: **${song.name}**`
        ).catch(() => {});
    })

    .on('finish', (queue) => {
        queue.textChannel?.send(
            '✅ انتهت قائمة التشغيل.'
        ).catch(() => {});
    })

    .on('disconnect', (queue) => {
        queue.textChannel?.send(
            '🔌 تم فصل البوت من الروم الصوتي.'
        ).catch(() => {});
    })

    .on('error', (error, queue) => {
        console.log('PLAY ERROR FULL:', error);

        logger.error(`DisTube Error: ${error.stack || error}`);

        queue?.textChannel?.send(
            `❌ حدث خطأ أثناء تشغيل الموسيقى.\n\n\`${error.message || error}\``
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
        logger.error(`Discord client login failed: ${error.stack || error}`);
    });