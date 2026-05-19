const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('city-panel')
        .setDescription('إرسال لوحة إنشاء شخصية NEXUS CITY'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle('🌆 NEXUS CITY | إنشاء شخصية')
            .setDescription(
                `مرحبًا بك داخل **NEXUS CITY**.\n\n` +
                `قبل دخول المدينة، يجب عليك إنشاء شخصية خاصة بك.\n\n` +
                `ستحتاج إلى تعبئة:\n` +
                `👤 اسم الشخصية\n` +
                `🎂 العمر\n` +
                `🌍 الجنسية\n` +
                `📖 نبذة قصيرة عن الشخصية\n\n` +
                `بعد إنشاء الشخصية ستحصل على:\n` +
                `💵 500 Nexus Dollars\n` +
                `🪪 هوية داخل المدينة\n` +
                `🌆 رتبة City Citizen\n\n` +
                `⚠️ لا يمكنك إنشاء أكثر من شخصية.`
            )
            .setFooter({ text: 'NEXUS CITY • Character Creation' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('city_create_character')
                .setLabel('إنشاء شخصية')
                .setEmoji('🌆')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });

        return interaction.reply({
            content: '✅ تم إرسال لوحة إنشاء الشخصية.',
            flags: 64
        });
    }
};