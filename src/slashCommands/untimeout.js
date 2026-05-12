const { SlashCommandBuilder } = require('discord.js');

const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');
const sendModLog = require('../utils/modLogger');
const { hasModerationPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('إزالة Timeout عن عضو')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب إزالة التايم أوت')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });

        if (!hasModerationPermission(interaction.member)) {
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

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Timeout System',
                        description: 'العضو غير موجود داخل السيرفر.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        if (!member.isCommunicationDisabled()) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '⚠️ NEXUS Timeout System',
                        description: 'هذا العضو لا يملك Timeout حاليًا.',
                        fields: [
                            {
                                name: '👤 العضو',
                                value: `${user}`,
                                inline: true
                            }
                        ],
                        thumbnail: user.displayAvatarURL()
                    })
                ]
            });
        }

        try {
            await member.timeout(null, reason);

            await sendModLog(client, {
                title: '✅ Timeout Removed',
                description: 'تم إزالة Timeout عن عضو داخل السيرفر.',
                thumbnail: user.displayAvatarURL(),
                fields: [
                    {
                        name: '👤 العضو',
                        value: `${user}`,
                        inline: true
                    },
                    {
                        name: '🛡️ الإداري',
                        value: `${interaction.user}`,
                        inline: true
                    },
                    {
                        name: '🆔 User ID',
                        value: `\`${user.id}\``,
                        inline: true
                    },
                    {
                        name: '📌 السبب',
                        value: reason,
                        inline: false
                    }
                ]
            });

            logger.info(`${interaction.user.tag} removed timeout from ${user.tag} | Reason: ${reason}`);

            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '✅ NEXUS Timeout System',
                        description: 'تم إزالة Timeout عن العضو بنجاح.',
                        fields: [
                            {
                                name: '👤 العضو',
                                value: `${user}`,
                                inline: true
                            },
                            {
                                name: '🛡️ الإداري',
                                value: `${interaction.user}`,
                                inline: true
                            },
                            {
                                name: '📌 السبب',
                                value: reason,
                                inline: false
                            }
                        ],
                        thumbnail: user.displayAvatarURL()
                    })
                ]
            });

        } catch (error) {
            logger.error(`Untimeout command error: ${error.stack || error}`);

            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Timeout System',
                        description: 'حدث خطأ أثناء إزالة Timeout.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }
    }
};