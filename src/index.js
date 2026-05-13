require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits
} = require('discord.js');

const { Manager } = require('erela.js');

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

client.manager = new Manager({
    nodes: [
        {
            identifier: 'NEXUS-LAVALINK',
            host: process.env.LAVALINK_HOST,
            port: 443,
            password: process.env.LAVALINK_PASSWORD,
            secure: true
        }
    ],

    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    }
});

client.manager
    .on('nodeConnect', (node) => {
        logger.info(`Lavalink connected: ${node.options.identifier}`);
        console.log(`✅ Lavalink Connected: ${node.options.identifier}`);
    })

    .on('nodeError', (node, error) => {
        logger.error(`Lavalink error: ${node.options.identifier} | ${error.stack || error}`);
        console.error(`❌ Lavalink Error: ${error.message || error}`);
    })

    .on('trackStart', (player, track) => {
        const channel = client.channels.cache.get(player.textChannel);

        channel?.send({
            embeds: [
                {
                    color: 0xD4AF37,
                    title: '🎶 NEXUS Music System',
                    description: `يتم الآن تشغيل:\n\`${track.title}\``,
                    fields: [
                        {
                            name: '👤 الطلب بواسطة',
                            value: `${track.requester || 'غير معروف'}`,
                            inline: true
                        },
                        {
                            name: '🔊 الروم الصوتي',
                            value: `<#${player.voiceChannel}>`,
                            inline: true
                        }
                    ],
                    footer: {
                        text: 'NEXUS COMMUNITY • Lavalink Music System'
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        }).catch(() => {});
    })

    .on('trackError', (player, track, payload) => {
        const channel = client.channels.cache.get(player.textChannel);

        logger.error(`Track error: ${track?.title || 'Unknown'} | ${payload?.error || 'Unknown error'}`);

        channel?.send({
            embeds: [
                {
                    color: 0xFF0000,
                    title: '❌ NEXUS Music System',
                    description: `حدث خطأ أثناء تشغيل:\n\`${track?.title || 'Unknown Track'}\``,
                    footer: {
                        text: 'NEXUS COMMUNITY • Music Error'
                    }
                }
            ]
        }).catch(() => {});
    })

    .on('queueEnd', (player) => {
        const channel = client.channels.cache.get(player.textChannel);

        channel?.send({
            embeds: [
                {
                    color: 0xD4AF37,
                    title: '✅ NEXUS Music System',
                    description: 'انتهت قائمة التشغيل.',
                    footer: {
                        text: 'NEXUS COMMUNITY • Queue Ended'
                    }
                }
            ]
        }).catch(() => {});

        player.destroy();
    });

client.once('clientReady', () => {
    client.manager.init(client.user.id);

    logger.info(`NEXUS BOT ONLINE AS ${client.user.tag}`);
    console.log(`✅ NEXUS BOT ONLINE AS ${client.user.tag}`);
});

client.on('raw', (data) => {
    client.manager.updateVoiceState(data);
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