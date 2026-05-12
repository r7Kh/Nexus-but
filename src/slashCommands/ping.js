const { SlashCommandBuilder } = require('discord.js');

const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with bot latency'),

    async execute(interaction, client) {

        const websocketPing = client.ws?.ping ?? 0;
        const responseTime = Date.now() - interaction.createdTimestamp;

        const embed = createEmbed({
            title: '🏓 NEXUS Ping System',
            description: 'تم فحص سرعة استجابة البوت بنجاح.',
            fields: [
                {
                    name: '📡 WebSocket Ping',
                    value: `\`${websocketPing}ms\``,
                    inline: true
                },
                {
                    name: '⚡ Response Time',
                    value: `\`${responseTime}ms\``,
                    inline: true
                },
                {
                    name: '🟢 Status',
                    value: '`Online`',
                    inline: true
                }
            ],
            thumbnail: client.user.displayAvatarURL()
        });

        await interaction.reply({
            embeds: [embed],
            flags: 64
        });

        logger.info(`${interaction.user.tag} checked bot latency`);
    }
};