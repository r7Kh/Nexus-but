const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/warningsDB');

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
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const warningId = interaction.options.getInteger('id');

        const warnings = db.getWarnings(user.id);

        if (!warnings.length) {
            return interaction.reply({
                content: `❌ العضو ${user.tag} لا يملك أي تحذيرات`
            });
        }

        if (warningId < 1 || warningId > warnings.length) {
            return interaction.reply({
                content: `❌ رقم التحذير غير صحيح`
            });
        }

        db.removeWarning(user.id, warningId - 1);

        return interaction.reply({
            content: `✅ تم حذف التحذير رقم ${warningId} من ${user.tag}`
        });
    }
};