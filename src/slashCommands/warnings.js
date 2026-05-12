const { SlashCommandBuilder } = require('discord.js');

const db = require('../utils/warningsDB');
const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');
const { hasModerationPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض تحذيرات عضو')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو')
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
        const warnings = db.getWarnings(user.id);

        if (!warnings.length) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '✅ NEXUS Warning System',
                        description: `العضو ${user} لا يملك أي تحذيرات.`,
                        thumbnail: user.displayAvatarURL()
                    })
                ]
            });
        }

        const warningList = warnings
            .map((warning, index) => {
                return (
                    `**#${index + 1}**\n` +
                    `🛡️ المشرف: <@${warning.moderatorId || interaction.user.id}>\n` +
                    `📌 السبب: ${warning.reason}\n` +
                    `📅 التاريخ: ${warning.date}`
                );
            })
            .join('\n\n');

        logger.info(`${interaction.user.tag} checked warnings for ${user.tag}`);

        return interaction.editReply({
            embeds: [
                createEmbed({
                    title: '⚠️ NEXUS Warning System',
                    description: warningList,
                    fields: [
                        {
                            name: '👤 العضو',
                            value: `${user}`,
                            inline: true
                        },
                        {
                            name: '📊 مجموع التحذيرات',
                            value: `\`${warnings.length}\``,
                            inline: true
                        }
                    ],
                    thumbnail: user.displayAvatarURL()
                })
            ]
        });
    }
};