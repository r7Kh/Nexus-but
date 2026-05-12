const { SlashCommandBuilder } = require('discord.js');

const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');
const sendModLog = require('../utils/modLogger');
const { hasAdminPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('فك الحظر عن عضو')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('ID العضو المراد فك حظره')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب فك الحظر')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });

        if (!hasAdminPermission(interaction.member)) {
            return interaction.editReply({
                embeds: [createEmbed({
                    title: '🚫 NEXUS Permission System',
                    description: 'ليس لديك صلاحية لاستخدام هذا الأمر.',
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }

        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'بدون سبب';

        try {
            const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);

            if (!bannedUser) {
                return interaction.editReply({
                    embeds: [createEmbed({
                        title: '❌ NEXUS Unban System',
                        description: 'هذا العضو غير موجود في قائمة المحظورين.',
                        fields: [
                            { name: '🆔 User ID', value: `\`${userId}\``, inline: true }
                        ],
                        thumbnail: client.user.displayAvatarURL()
                    })]
                });
            }

            await interaction.guild.members.unban(userId, reason);

            await sendModLog(client, {
                title: '✅ Member Unbanned',
                description: 'تم فك الحظر عن عضو داخل السيرفر.',
                thumbnail: bannedUser.user.displayAvatarURL(),
                fields: [
                    { name: '👤 العضو', value: `<@${userId}>`, inline: true },
                    { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                    { name: '🆔 User ID', value: `\`${userId}\``, inline: true },
                    { name: '📌 السبب', value: reason, inline: false }
                ]
            });

            logger.info(`${interaction.user.tag} unbanned ${bannedUser.user.tag} | Reason: ${reason}`);

            return interaction.editReply({
                embeds: [createEmbed({
                    title: '✅ NEXUS Unban System',
                    description: 'تم فك الحظر عن العضو بنجاح.',
                    fields: [
                        { name: '👤 العضو', value: `<@${userId}>`, inline: true },
                        { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                        { name: '🆔 User ID', value: `\`${userId}\``, inline: true },
                        { name: '📌 السبب', value: reason, inline: false }
                    ],
                    thumbnail: bannedUser.user.displayAvatarURL()
                })]
            });

        } catch (error) {
            logger.error(`Unban command error: ${error.stack || error}`);

            return interaction.editReply({
                embeds: [createEmbed({
                    title: '❌ NEXUS Unban System',
                    description: 'حدث خطأ أثناء فك الحظر عن العضو.',
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }
    }
};