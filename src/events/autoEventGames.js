const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const gameSessions = require('../utils/gameSessions');

const GAME_CHANNEL_ID = '1429135776289132544';

const EVENT_INTERVAL = 2 * 60 * 60 * 1000;
const EVENT_DURATION = 15 * 60 * 1000;

const games = [
    {
        id: 'dice',
        name: '🎲 Dice Event',
        description: 'اختار الرقم الصحيح واربح جوائز مضاعفة ×2'
    },
    {
        id: 'coinflip',
        name: '🪙 Coinflip Event',
        description: 'Heads أو Tails؟ الجوائز الآن ×2'
    },
    {
        id: 'quiz',
        name: '🧠 Quiz Event',
        description: 'جاوب صح واربح XP و Coins مضاعفة'
    },
    {
        id: 'roulette',
        name: '🎯 Roulette Event',
        description: 'الروليت شغال بجوائز مضاعفة ×2'
    },
    {
        id: 'mines',
        name: '💣 Mines Event',
        description: 'خليك ذكي، جوائز Mines الآن ×2'
    }
];

function randomGame() {
    return games[Math.floor(Math.random() * games.length)];
}

function eventEmbed(game) {
    return new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle('🎉 NEXUS GLOBAL EVENT')
        .setDescription(
            `🔥 بدأ حدث جديد داخل السيرفر!\n\n` +
            `🎮 اللعبة: **${game.name}**\n` +
            `📌 ${game.description}\n\n` +
            `💎 جميع جوائز الألعاب الآن: **×2**\n` +
            `⏱️ مدة الحدث: \`15 دقيقة\`\n\n` +
            `اكتب \`/games\` وابدأ اللعب قبل انتهاء الحدث!`
        )
        .setImage('https://i.imgur.com/1Q9Z1Zm.gif')
        .setFooter({
            text: 'NEXUS COMMUNITY • Global Event System'
        })
        .setTimestamp();
}

module.exports = {
    name: 'clientReady',
    once: true,

    async execute(client) {
        console.log('🎉 Auto Event System Started');

        setInterval(async () => {
            try {
                const channel = await client.channels.fetch(GAME_CHANNEL_ID).catch(() => null);
                if (!channel) return;

                const game = randomGame();

                gameSessions.setGlobalEvent({
                    active: true,
                    game: game.id,
                    gameName: game.name,
                    multiplier: 2,
                    startedAt: Date.now(),
                    expiresAt: Date.now() + EVENT_DURATION
                });

                await channel.send({
                    content: '@everyone',
                    embeds: [eventEmbed(game)],
                    allowedMentions: {
                        parse: ['everyone']
                    }
                });

                setTimeout(async () => {
                    const currentEvent = gameSessions.getGlobalEvent();

                    if (currentEvent && currentEvent.game === game.id) {
                        gameSessions.setGlobalEvent(null);
                    }

                    await channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF3333')
                                .setTitle('⌛ انتهى الحدث')
                                .setDescription(
                                    `انتهى حدث **${game.name}**.\n\n` +
                                    `💎 عادت الجوائز للوضع الطبيعي.`
                                )
                                .setFooter({
                                    text: 'NEXUS COMMUNITY • Event Ended'
                                })
                                .setTimestamp()
                        ]
                    }).catch(() => {});
                }, EVENT_DURATION);

            } catch (error) {
                console.error('Auto Event Error:', error);
            }
        }, EVENT_INTERVAL);
    }
};