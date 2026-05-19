const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const CityPlayer = require('../models/CityPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('عرض شخصيتك داخل NEXUS CITY'),

    async execute(interaction) {
        const player = await CityPlayer.findOne({
            userId: interaction.user.id
        });

        if (!player) {
            return interaction.reply({
                content: '❌ لا تملك شخصية داخل NEXUS CITY. توجه إلى روم إنشاء الشخصية.',
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle(`🪪 هوية ${player.characterName}`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setDescription(
                `🌆 **NEXUS CITY PROFILE**\n\n` +
                `👤 الاسم: **${player.characterName}**\n` +
                `🎂 العمر: **${player.age}**\n` +
                `🌍 الجنسية: **${player.nationality}**\n\n` +
                `🏛️ الفصيل: **${player.faction}**\n` +
                `🎖️ الرتبة: **${player.factionRank}**\n` +
                `🟢 الخدمة: **${player.inDuty ? 'داخل الخدمة' : 'خارج الخدمة'}**\n\n` +
                `💵 الكاش: **${player.nexusDollars} Nexus Dollars**\n` +
                `🏦 البنك: **${player.bank} Nexus Dollars**\n\n` +
                `🔫 السلاح الحالي: **${player.selectedWeapon || 'لا يوجد'}**\n` +
                `🚗 السيارة الحالية: **${player.selectedVehicle || 'لا يوجد'}**\n\n` +
                `⭐ المستوى: **${player.level}**\n` +
                `✨ XP: **${player.xp}**\n` +
                `🚨 Wanted Level: **${player.wantedLevel}**\n` +
                `📈 السمعة: **${player.reputation || 0}**`
            )
            .setFooter({ text: 'NEXUS CITY • Identity System' })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            flags: 64
        });
    }
};