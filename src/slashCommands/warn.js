const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/warningsDB');
const logger = require('../utils/logger');

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
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'بدون سبب';

        const warning = {
            reason,
            moderator: interaction.user.tag,
            date: new Date().toLocaleString()
        };

        db.addWarning(user.id, warning);

        logger.addLog('WARN', interaction.user.tag, user.tag, reason);

        const warnings = db.getWarnings(user.id);

        return interaction.editReply({
            content: `⚠️ تم إضافة تحذير لـ ${user.tag}\n📌 السبب: ${reason}\n📊 مجموع التحذيرات: ${warnings.length}`
        });
    }
};