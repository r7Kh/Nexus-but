const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const gameSessions = require('../utils/gameSessions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear-games')
        .setDescription('تنظيف كل جلسات الألعاب العالقة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const count = gameSessions.clearAllSessions();

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle('🧹 NEXUS Games Cleaner')
                    .setDescription(
                        `تم تنظيف جلسات الألعاب العالقة.\n\n` +
                        `🗑️ عدد الجلسات المحذوفة: \`${count}\``
                    )
                    .setFooter({
                        text: 'NEXUS COMMUNITY • Game System'
                    })
                    .setTimestamp()
            ],
            flags: 64
        });
    }
};