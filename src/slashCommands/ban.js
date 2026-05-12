const { SlashCommandBuilder } = require('discord.js');

const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');
const sendModLog = require('../utils/modLogger');
const { hasAdminPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو المراد حظره')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب الحظر')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });

        if (!hasAdminPermission(interaction.member)) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '🚫 NEXUS Permission System',
                        description: 'ليس لديك صلاحية لاستخدام هذا الأمر.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'بدون سبب';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Ban System',
                        description: 'العضو غير موجود داخل السيرفر.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        if (!member.bannable) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '⚠️ NEXUS Ban System',
                        description: 'لا أستطيع حظر هذا العضو بسبب الصلاحيات أو ترتيب الرتب.',
                        fields: [
                            {
                                name: '👤 العضو',
                                value: `${user}`,
                                inline: true
                            }
                        ],
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        try {
            await member.ban({ reason });

            await sendModLog(client, {
                title: '🔨 Member Banned',
                description: 'تم تنفيذ عملية حظر داخل السيرفر.',
                thumbnail: user.displayAvatarURL(),
                fields: [
                    { name: '👤 العضو', value: `${user}`, inline: true },
                    { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                    { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
                    { name: '📌 السبب', value: reason, inline: false }
                ]
            });

            logger.info(`${interaction.user.tag} banned ${user.tag} | Reason: ${reason}`);

            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '🔨 NEXUS Ban System',
                        description: 'تم تنفيذ الحظر بنجاح.',
                        fields: [
                            { name: '👤 العضو', value: `${user}`, inline: true },
                            { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                            { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
                            { name: '📌 السبب', value: reason, inline: false }
                        ],
                        thumbnail: user.displayAvatarURL()
                    })
                ]
            });

        } catch (error) {
            logger.error(`Ban command error: ${error.stack || error}`);

            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Ban System',
                        description: 'حدث خطأ أثناء تنفيذ الحظر.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }
    }
};