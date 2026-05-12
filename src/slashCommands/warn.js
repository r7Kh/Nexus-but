const { SlashCommandBuilder } = require('discord.js');

const db = require('../utils/warningsDB');
const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');
const sendModLog = require('../utils/modLogger');
const { hasModerationPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('إضافة تحذير لعضو')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب التحذير')
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

        const warning = {
            reason,
            moderator: interaction.user.tag,
            moderatorId: interaction.user.id,
            date: new Date().toLocaleString()
        };

        db.addWarning(user.id, warning);

        const warnings = db.getWarnings(user.id);

        await sendModLog(client, {
            title: '⚠️ Member Warned',
            description: 'تم إعطاء تحذير داخل السيرفر.',
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
                    name: '📊 مجموع التحذيرات',
                    value: `\`${warnings.length}\``,
                    inline: true
                },
                {
                    name: '📌 السبب',
                    value: reason,
                    inline: false
                }
            ]
        });

        logger.info(`${interaction.user.tag} warned ${user.tag} | Reason: ${reason}`);

        return interaction.editReply({
            embeds: [
                createEmbed({
                    title: '⚠️ NEXUS Warn System',
                    description: 'تم إضافة تحذير للعضو بنجاح.',
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
                            name: '📊 مجموع التحذيرات',
                            value: `\`${warnings.length}\``,
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
    }
};