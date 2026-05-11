const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with bot latency'),

    async execute(interaction, client) {
        try {
            const ping = client.ws?.ping ?? 'N/A';

            return await interaction.reply({
                content: `🏓 Pong! ${ping}ms`
            });
        } catch (err) {
            console.error('Ping Error:', err);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Error executing ping command',
                    ephemeral: true
                });
            }
        }
    }
};