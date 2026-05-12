const { EmbedBuilder } = require('discord.js');

const LOG_CHANNEL_ID = '1429143505564864592';

async function sendModLog(client, options = {}) {
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle(options.title || 'NEXUS Moderation Logs')
            .setDescription(options.description || 'No description provided.')
            .setFooter({
                text: 'NEXUS COMMUNITY • Moderation Logs'
            })
            .setTimestamp();

        if (options.fields) {
            embed.addFields(options.fields);
        }

        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }

        await channel.send({
            embeds: [embed]
        });

    } catch (error) {
        console.error('Mod Logger Error:', error);
    }
}

module.exports = sendModLog;