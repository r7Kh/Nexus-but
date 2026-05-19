const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

const CityPlayer = require('../models/CityPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joincity')
        .setDescription('إنشاء شخصيتك داخل NEXUS CITY'),

    async execute(interaction) {

        const exists = await CityPlayer.findOne({
            userId: interaction.user.id
        });

        if (exists) {
            return interaction.reply({
                content: '❌ لديك شخصية بالفعل داخل NEXUS CITY.',
                flags: 64
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('joincity_modal')
            .setTitle('🌆 إنشاء شخصية');

        const nameInput = new TextInputBuilder()
            .setCustomId('character_name')
            .setLabel('اسم الشخصية')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(20)
            .setPlaceholder('مثال: Ahmed Walker');

        const ageInput = new TextInputBuilder()
            .setCustomId('character_age')
            .setLabel('العمر')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('22');

        const nationalityInput = new TextInputBuilder()
            .setCustomId('character_nationality')
            .setLabel('الجنسية')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Syrian');

        const storyInput = new TextInputBuilder()
            .setCustomId('character_story')
            .setLabel('نبذة عن شخصيتك')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(300)
            .setPlaceholder('اكتب نبذة قصيرة عن شخصيتك');

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(ageInput),
            new ActionRowBuilder().addComponents(nationalityInput),
            new ActionRowBuilder().addComponents(storyInput)
        );

        await interaction.showModal(modal);
    }
};