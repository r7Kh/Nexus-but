const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const gameDB = require('../utils/gameDB');

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    return `${h} ساعة و ${m} دقيقة`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('استلام المكافأة اليومية'),

    async execute(interaction) {
        const result = gameDB.claimDaily(interaction.user);

        if (!result.claimed) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF3B3B')
                        .setTitle('⏳ NEXUS Daily Reward')
                        .setDescription(
                            `${interaction.user}\n\n` +
                            `لقد استلمت مكافأتك اليومية بالفعل.\n\n` +
                            `⏱️ المتبقي: \`${formatTime(result.remaining)}\``
                        )
                        .setFooter({ text: 'NEXUS COMMUNITY • Daily System' })
                        .setTimestamp()
                ],
                flags: 64
            });
        }

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle('🎁 NEXUS Daily Reward')
                    .setDescription(
                        `${interaction.user}\n\n` +
                        `تم استلام مكافأتك اليومية بنجاح!\n\n` +
                        `💰 Coins: \`+${result.coins}\`\n` +
                        `⭐ XP: \`+${result.xp}\`\n` +
                        `🔥 Daily Streak: \`${result.streak}\`\n\n` +
                        `رصيدك الحالي: \`${result.player.coins}\` Coins`
                    )
                    .setFooter({ text: 'NEXUS COMMUNITY • Daily System' })
                    .setTimestamp()
            ]
        });
    }
};