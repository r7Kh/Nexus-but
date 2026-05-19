const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const CityPlayer = require('../models/CityPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('faction-panel')
        .setDescription('فتح لوحة إدارة الفصيل'),

    async execute(interaction) {
        const player = await CityPlayer.findOne({ userId: interaction.user.id });

        if (!player) {
            return interaction.reply({
                content: '❌ لا تملك شخصية داخل NEXUS CITY.',
                flags: 64
            });
        }

        if (!['Leader', 'Deputy'].includes(player.factionRank)) {
            return interaction.reply({
                content: '❌ هذه اللوحة مخصصة فقط للقائد أو النائب.',
                flags: 64
            });
        }

        if (player.faction === 'Civilian') {
            return interaction.reply({
                content: '❌ أنت لا تنتمي لأي فصيل.',
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle(`🏛️ لوحة إدارة الفصيل | ${player.faction}`)
            .setDescription(
                `مرحبًا **${player.characterName}**\n\n` +
                `🎖️ رتبتك: **${player.factionRank}**\n` +
                `🏛️ الفصيل: **${player.faction}**\n\n` +
                `اختر العملية التي تريد تنفيذها من الأزرار بالأسفل.`
            )
            .setFooter({ text: 'NEXUS CITY • Faction Management' })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('city_faction_members')
                .setLabel('أعضاء الفصيل')
                .setEmoji('👥')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('city_faction_invite')
                .setLabel('دعوة عضو')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('city_faction_kick')
                .setLabel('طرد عضو')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('city_faction_promote')
                .setLabel('ترقية')
                .setEmoji('🎖️')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('city_faction_demote')
                .setLabel('تخفيض')
                .setEmoji('📉')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
            embeds: [embed],
            components: [row1, row2],
            flags: 64
        });
    }
};