const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/warningsDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض تحذيرات عضو')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const warnings = db.getWarnings(user.id);

        if (!warnings.length) {
            return interaction.reply({
                content: `✅ العضو ${user.tag} لا يملك أي تحذيرات.`
            });
        }

        const list = warnings
            .map((warning, index) => {
                return `**${index + 1}.** السبب: ${warning.reason}\nالمشرف: ${warning.moderator}\nالتاريخ: ${warning.date}`;
            })
            .join('\n\n');

        return interaction.reply({
            content: `⚠️ تحذيرات ${user.tag}\n\n${list}`
        });
    }
};