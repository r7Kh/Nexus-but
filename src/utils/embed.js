const { EmbedBuilder } = require('discord.js');

module.exports = (options = {}) => {
    const embed = new EmbedBuilder()
        .setColor('#D4AF37')
        .setFooter({
            text: 'NEXUS COMMUNITY • Advanced System'
        })
        .setTimestamp();

    if (options.title) {
        embed.setTitle(options.title);
    }

    if (options.description) {
        embed.setDescription(options.description);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.image) {
        embed.setImage(options.image);
    }

    if (options.fields) {
        embed.addFields(options.fields);
    }

    return embed;
};