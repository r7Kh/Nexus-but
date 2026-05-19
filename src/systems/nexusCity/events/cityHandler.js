const {
    EmbedBuilder
} = require('discord.js');

const CityPlayer = require('../models/CityPlayer');

const CITY_ROLE_ID = '1506231341455511642';

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {

        if (!interaction.isModalSubmit()) return;

        if (interaction.customId !== 'joincity_modal') return;

        const exists = await CityPlayer.findOne({
            userId: interaction.user.id
        });

        if (exists) {
            return interaction.reply({
                content: '❌ لديك شخصية بالفعل.',
                flags: 64
            });
        }

        const characterName =
            interaction.fields.getTextInputValue('character_name');

        const age =
            interaction.fields.getTextInputValue('character_age');

        const nationality =
            interaction.fields.getTextInputValue('character_nationality');

        const story =
            interaction.fields.getTextInputValue('character_story') || 'No story';

        if (isNaN(age)) {
            return interaction.reply({
                content: '❌ العمر يجب أن يكون رقم.',
                flags: 64
            });
        }

        await CityPlayer.create({
            userId: interaction.user.id,
            discordTag: interaction.user.tag,
            characterName,
            age: Number(age),
            nationality,
            story,
            nexusDollars: 500,
            bank: 0
        });

        const role = interaction.guild.roles.cache.get(CITY_ROLE_ID);

        if (role) {
            await interaction.member.roles.add(role).catch(() => {});
        }

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle('🌆 تم إنشاء شخصيتك')
            .setDescription(
                `مرحبًا بك في NEXUS CITY\n\n` +
                `👤 الاسم: **${characterName}**\n` +
                `🎂 العمر: **${age}**\n` +
                `🌍 الجنسية: **${nationality}**\n\n` +
                `💰 حصلت على:\n` +
                `💵 500 Nexus Dollars\n\n` +
                `استمتع داخل المدينة 🌆`
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();

        return interaction.reply({
            embeds: [embed]
        });
    }
};