const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const gameSessions = require('../utils/gameSessions');

const GAME_CHANNEL_ID = '1429135776289132544';

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('end-event')
        .setDescription('إنهاء حدث الألعاب الحالي'),

    async execute(interaction) {
        if (!hasPermission(interaction.member, interaction.user.id)) {
            return interaction.reply({
                content: '❌ هذا الأمر مخصص للإدارة العليا فقط.',
                flags: 64
            });
        }

        const currentEvent = gameSessions.getGlobalEvent();

        if (!currentEvent) {
            return interaction.reply({
                content: '❌ لا يوجد حدث شغال حاليًا.',
                flags: 64
            });
        }

        gameSessions.clearGlobalEvent();

        const channel = await interaction.client.channels.fetch(GAME_CHANNEL_ID).catch(() => null);

        if (channel) {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF3333')
                        .setTitle('🛑 تم إنهاء الحدث')
                        .setDescription(
                            `تم إنهاء الحدث الحالي بواسطة ${interaction.user}.\n\n` +
                            `💎 عادت الجوائز للوضع الطبيعي.`
                        )
                        .setFooter({
                            text: 'NEXUS COMMUNITY • Manual Event System'
                        })
                        .setTimestamp()
                ]
            }).catch(() => {});
        }

        return interaction.reply({
            content: '✅ تم إنهاء الحدث بنجاح.',
            flags: 64
        });
    }
};