const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('city')
        .setDescription('لوحة NEXUS CITY الرئيسية'),

    async execute(interaction) {
        return interaction.reply({
            content: '🌆 NEXUS CITY قيد التطوير حاليًا.',
            flags: 64
        });
    }
};