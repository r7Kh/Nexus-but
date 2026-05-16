const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const gameDB = require('../utils/gameDB');

function shopButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('shop_buy_badge_elite')
                .setLabel('NEXUS Elite Badge')
                .setEmoji('💎')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('shop_buy_xp_boost')
                .setLabel('XP Boost')
                .setEmoji('⚡')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('shop_buy_coin_shield')
                .setLabel('Coin Shield')
                .setEmoji('🛡️')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('فتح متجر ألعاب NEXUS'),

    async execute(interaction) {
        const player = gameDB.getPlayer(interaction.user);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle('🛒 NEXUS Game Shop')
                    .setDescription(
                        `${interaction.user}\n\n` +
                        `رصيدك الحالي: \`${player.coins}\` Coins\n\n` +
                        `💎 **NEXUS Elite Badge** — \`1000 Coins\`\n` +
                        `شارة فخمة تظهر في بروفايلك.\n\n` +
                        `⚡ **XP Boost** — \`750 Coins\`\n` +
                        `يضاعف XP في الألعاب القادمة.\n\n` +
                        `🛡️ **Coin Shield** — \`500 Coins\`\n` +
                        `يحميك من أول خسارة Coins قادمة.`
                    )
                    .setFooter({ text: 'NEXUS COMMUNITY • Shop System' })
                    .setTimestamp()
            ],
            components: shopButtons(),
            flags: 64
        });
    }
};