const { SlashCommandBuilder } = require('discord.js');

const db = require('../utils/warningsDB');
const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');
const sendModLog = require('../utils/modLogger');
const { hasModerationPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('حذف تحذير من عضو')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('رقم التحذير')
                .setRequired(true)
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
        const warningId = interaction.options.getInteger('id');

        const warnings = db.getWarnings(user.id);

        if (!warnings.length) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Warning System',
                        description: `العضو ${user} لا يملك أي تحذيرات.`,
                        thumbnail: user.displayAvatarURL()
                    })
                ]
            });
        }

        if (warningId < 1 || warningId > warnings.length) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '⚠️ NEXUS Warning System',
                        description: 'رقم التحذير غير صحيح.',
                        fields: [
                            {
                                name: '📊 عدد التحذيرات الحالية',
                                value: `\`${warnings.length}\``,
                                inline: true
                            }
                        ],
                        thumbnail: user.displayAvatarURL()
                    })
                ]
            });
        }

        const removedWarning = warnings[warningId - 1];

        db.removeWarning(user.id, warningId - 1);

        const remainingWarnings = db.getWarnings(user.id);

        await sendModLog(client, {
            title: '🗑️ Warning Removed',
            description: 'تم حذف تحذير من عضو داخل السيرفر.',
            thumbnail: user.displayAvatarURL(),
            fields: [
                { name: '👤 العضو', value: `${user}`, inline: true },
                { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                { name: '🗑️ رقم التحذير', value: `\`#${warningId}\``, inline: true },
                { name: '📌 سبب التحذير المحذوف', value: removedWarning.reason, inline: false },
                { name: '📊 التحذيرات المتبقية', value: `\`${remainingWarnings.length}\``, inline: true }
            ]
        });

        logger.info(`${interaction.user.tag} removed warning #${warningId} from ${user.tag}`);

        return interaction.editReply({
            embeds: [
                createEmbed({
                    title: '✅ NEXUS Warning System',
                    description: 'تم حذف التحذير بنجاح.',
                    fields: [
                        { name: '👤 العضو', value: `${user}`, inline: true },
                        { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                        { name: '🗑️ رقم التحذير', value: `\`#${warningId}\``, inline: true },
                        { name: '📌 سبب التحذير المحذوف', value: removedWarning.reason, inline: false },
                        { name: '📊 التحذيرات المتبقية', value: `\`${remainingWarnings.length}\``, inline: true }
                    ],
                    thumbnail: user.displayAvatarURL()
                })
            ]
        });
    }
};