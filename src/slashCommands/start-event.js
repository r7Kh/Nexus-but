const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const gameSessions = require('../utils/gameSessions');

const GAME_CHANNEL_ID = '1429135776289132544';

// حط ايديك هون
const OWNER_IDS = [
    '429008086917840907'
];

const HIGH_ROLE_IDS = [
    '1429197885139980348', // Cm
    '1436501239599992985', // LeadAdmin
    '1436484272101003386', // Responsible
    '1429135690808954950'  // Administrator
];

function hasPermission(member, userId) {
    if (OWNER_IDS.includes(userId)) return true;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

    return HIGH_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

function eventEmbed({ game, multiplier, duration }) {
    return new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle('🎉 NEXUS GLOBAL EVENT STARTED')
        .setDescription(
            `@everyone\n\n` +
            `🔥 تم تشغيل حدث يدوي من الإدارة!\n\n` +
            `🎮 اللعبة: **${game}**\n` +
            `💎 الجوائز: **×${multiplier}**\n` +
            `⏱️ المدة: \`${duration}\` دقيقة\n\n` +
            `اكتب \`/games\` وابدأ اللعب قبل انتهاء الحدث!`
        )
        .setFooter({
            text: 'NEXUS COMMUNITY • Manual Event System'
        })
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start-event')
        .setDescription('تشغيل حدث ألعاب يدوي بجوائز مضاعفة')
        .addStringOption(option =>
            option
                .setName('game')
                .setDescription('اللعبة')
                .setRequired(true)
                .addChoices(
                    { name: 'All Games', value: 'all' },
                    { name: 'Dice', value: 'dice' },
                    { name: 'Coinflip', value: 'coinflip' },
                    { name: 'Slots', value: 'slots' },
                    { name: 'Blackjack', value: 'blackjack' },
                    { name: 'Guess Number', value: 'guess' },
                    { name: 'Quiz', value: 'quiz' },
                    { name: 'Roulette', value: 'roulette' },
                    { name: 'Mines', value: 'mines' },
                    { name: 'Fast Type', value: 'fasttype' },
                    { name: 'Mafia', value: 'mafia' }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('multiplier')
                .setDescription('المضاعف')
                .setRequired(true)
                .addChoices(
                    { name: 'X2', value: 2 },
                    { name: 'X3', value: 3 },
                    { name: 'X4', value: 4 }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('مدة الحدث بالدقائق')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(120)
        ),

    async execute(interaction) {
        if (!hasPermission(interaction.member, interaction.user.id)) {
            return interaction.reply({
                content: '❌ هذا الأمر مخصص للإدارة العليا فقط.',
                flags: 64
            });
        }

        const game = interaction.options.getString('game');
        const multiplier = interaction.options.getInteger('multiplier');
        const duration = interaction.options.getInteger('duration');

        const channel = await interaction.client.channels.fetch(GAME_CHANNEL_ID).catch(() => null);

        if (!channel) {
            return interaction.reply({
                content: '❌ لم يتم العثور على روم الألعاب.',
                flags: 64
            });
        }

        const expiresAt = Date.now() + duration * 60 * 1000;

        gameSessions.setGlobalEvent({
            active: true,
            manual: true,
            game,
            gameName: game === 'all' ? 'All Games' : game,
            multiplier,
            startedBy: interaction.user.id,
            startedAt: Date.now(),
            expiresAt
        });

        const timeout = setTimeout(() => {
            gameSessions.clearGlobalEvent();

            channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF3333')
                        .setTitle('⌛ انتهى الحدث')
                        .setDescription(
                            `انتهى الحدث اليدوي.\n\n` +
                            `💎 عادت الجوائز للوضع الطبيعي.`
                        )
                        .setFooter({
                            text: 'NEXUS COMMUNITY • Event Ended'
                        })
                        .setTimestamp()
                ]
            }).catch(() => {});
        }, duration * 60 * 1000);

        gameSessions.setGlobalEventTimeout(timeout);

        await channel.send({
            content: '@everyone',
            embeds: [
                eventEmbed({
                    game: game === 'all' ? 'All Games' : game,
                    multiplier,
                    duration
                })
            ],
            allowedMentions: {
                parse: ['everyone']
            }
        });

        return interaction.reply({
            content: `✅ تم تشغيل الحدث بنجاح في <#${GAME_CHANNEL_ID}>.`,
            flags: 64
        });
    }
};