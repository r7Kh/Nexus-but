require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits
} = require('discord.js');

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
        new YouTubePlugin()
    ]
});

client.distube
    .on('playSong', (queue, song) => {
        queue.textChannel?.send({
            embeds: [
                {
                    color: 0xD4AF37,
                    title: '🎶 NEXUS Music System',
                    description: `جاري تشغيل:\n\`${song.name}\``,
                    thumbnail: {
                        url: client.user.displayAvatarURL()
                    }
                }
            ]
        }).catch(() => {});
    })

    .on('addSong', (queue, song) => {
        queue.textChannel?.send({
            embeds: [
                {
                    color: 0xD4AF37,
                    title: '➕ تمت إضافة أغنية',
                    description: `\`${song.name}\``
                }
            ]
        }).catch(() => {});
    })

    .on('error', (error, queue) => {
        console.log('PLAY ERROR FULL:', error);

        logger.error(
            `Play command error: ${error.stack || error}`
        );

        queue?.textChannel?.send({
            embeds: [
                {
                    color: 0xFF0000,
                    title: '❌ NEXUS Music System',
                    description:
                        'حدث خطأ أثناء تشغيل الموسيقى.\n\n' +
                        `\`${error.message || error}\``
                }
            ]
        }).catch(() => {});
    });

initDatabase();

slashCommandHandler(client);
eventHandler(client);

client.login(process.env.TOKEN)
    .then(() => {
        logger.info('Discord client login successful');
        console.log(`NEXUS BOT ONLINE AS ${client.user.tag}`);
    })
    .catch((error) => {
        logger.error(
            `Discord client login failed: ${error.stack || error}`
        );
    });