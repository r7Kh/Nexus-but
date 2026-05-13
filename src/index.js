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

/* =========================
   LAVALINK MANAGER
========================= */

client.manager = new Manager({
    nodes: [
        {
            identifier: 'NEXUS-LAVALINK',

            host: process.env.LAVALINK_HOST,
            port: Number(process.env.LAVALINK_PORT),

            password: process.env.LAVALINK_PASSWORD,

            secure:
                process.env.LAVALINK_SECURE === 'true'
        }
    ],

    send(id, payload) {
        const guild = client.guilds.cache.get(id);

        if (guild) {
            guild.shard.send(payload);
        }
    }
});

/* =========================
   LAVALINK EVENTS
========================= */

client.manager
    .on('nodeConnect', (node) => {
        console.log(
            `✅ Lavalink Connected: ${node.options.identifier}`
        );

        logger.info(
            `Lavalink connected: ${node.options.identifier}`
        );
    })

    .on('nodeError', (node, error) => {
        console.error(
            `❌ Lavalink Error: ${error.message}`
        );

        logger.error(
            `Lavalink error: ${node.options.identifier} | ${error.stack || error}`
        );
    })

    .on('trackStart', (player, track) => {
        const channel =
            client.channels.cache.get(player.textChannel);

        if (!channel) return;

        channel.send({
            embeds: [
                {
                    color: 0xD4AF37,

                    title:
                        '🎶 NEXUS Music System',

                    description:
                        `جاري تشغيل:\n\`${track.title}\``,

                    fields: [
                        {
                            name: '👤 الطلب بواسطة',
                            value:
                                `${track.requester || 'Unknown'}`,
                            inline: true
                        },

                        {
                            name: '🔊 الروم الصوتي',
                            value:
                                `<#${player.voiceChannel}>`,
                            inline: true
                        }
                    ],

                    footer: {
                        text:
                            'NEXUS COMMUNITY • Advanced Music System'
                    },

                    timestamp:
                        new Date().toISOString()
                }
            ]
        }).catch(() => {});
    })

    .on('trackError', (player, track, error) => {
        const channel =
            client.channels.cache.get(player.textChannel);

        console.error(
            `❌ Track Error: ${error?.message || error}`
        );

        if (!channel) return;

        channel.send({
            embeds: [
                {
                    color: 0xFF0000,

                    title:
                        '❌ NEXUS Music System',

                    description:
                        `حدث خطأ أثناء تشغيل:\n\`${track?.title || 'Unknown Track'}\``,

                    footer: {
                        text:
                            'NEXUS COMMUNITY • Music Error'
                    }
                }
            ]
        }).catch(() => {});
    })

    .on('queueEnd', (player) => {
        const channel =
            client.channels.cache.get(player.textChannel);

        if (channel) {
            channel.send({
                embeds: [
                    {
                        color: 0xD4AF37,

                        title:
                            '✅ NEXUS Music System',

                        description:
                            'انتهت قائمة التشغيل.',

                        footer: {
                            text:
                                'NEXUS COMMUNITY • Queue Ended'
                        }
                    }
                ]
            }).catch(() => {});
        }

        player.destroy();
    });

/* =========================
   CLIENT READY
========================= */

client.once('clientReady', async () => {
    console.log(
        `✅ NEXUS BOT ONLINE AS ${client.user.tag}`
    );

    logger.info(
        `NEXUS BOT ONLINE AS ${client.user.tag}`
    );

    client.manager.init(client.user.id);
});

/* =========================
   RAW VOICE UPDATE
========================= */

client.on('raw', (data) => {
    client.manager.updateVoiceState(data);
});

/* =========================
   LOAD SYSTEMS
========================= */

initDatabase();

slashCommandHandler(client);
eventHandler(client);

/* =========================
   LOGIN
========================= */

client.login(process.env.TOKEN)
    .then(() => {
        logger.info(
            'Discord client login successful'
        );
    })

    .catch((error) => {
        logger.error(
            `Discord client login failed: ${error.stack || error}`
        );

        console.error(error);
    });