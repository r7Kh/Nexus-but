const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

const CityPlayer = require('../models/CityPlayer');

const CITY_ROLE_ID = '1506231341455511642';

function createCharacterModal() {
    const modal = new ModalBuilder()
        .setCustomId('city_create_character_modal')
        .setTitle('🌆 إنشاء شخصية');

    const nameInput = new TextInputBuilder()
        .setCustomId('character_name')
        .setLabel('اسم الشخصية')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(25)
        .setPlaceholder('مثال: Ahmad Walker');

    const ageInput = new TextInputBuilder()
        .setCustomId('character_age')
        .setLabel('العمر')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('مثال: 22');

    const nationalityInput = new TextInputBuilder()
        .setCustomId('character_nationality')
        .setLabel('الجنسية')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30)
        .setPlaceholder('مثال: Syrian');

    const storyInput = new TextInputBuilder()
        .setCustomId('character_story')
        .setLabel('نبذة قصيرة عن الشخصية')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(300)
        .setPlaceholder('اكتب قصة قصيرة عن شخصيتك');

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(ageInput),
        new ActionRowBuilder().addComponents(nationalityInput),
        new ActionRowBuilder().addComponents(storyInput)
    );

    return modal;
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (interaction.isButton()) {
            if (interaction.customId !== 'city_create_character') return;

            const exists = await CityPlayer.findOne({
                userId: interaction.user.id
            });

            if (exists) {
                return interaction.reply({
                    content: '❌ لديك شخصية بالفعل داخل NEXUS CITY.',
                    flags: 64
                });
            }

            return interaction.showModal(createCharacterModal());
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId !== 'city_create_character_modal') return;

            const exists = await CityPlayer.findOne({
                userId: interaction.user.id
            });

            if (exists) {
                return interaction.reply({
                    content: '❌ لديك شخصية بالفعل.',
                    flags: 64
                });
            }

            const characterName = interaction.fields.getTextInputValue('character_name');
            const ageRaw = interaction.fields.getTextInputValue('character_age');
            const nationality = interaction.fields.getTextInputValue('character_nationality');
            const story = interaction.fields.getTextInputValue('character_story') || 'No story';

            const age = Number(ageRaw);

            if (!age || age < 12 || age > 90) {
                return interaction.reply({
                    content: '❌ العمر يجب أن يكون رقم بين 12 و 90.',
                    flags: 64
                });
            }

            await CityPlayer.create({
                userId: interaction.user.id,
                discordTag: interaction.user.tag,
                characterName,
                age,
                nationality,
                story,
                nexusDollars: 500,
                bank: 0,
                faction: 'Civilian',
                factionRank: 'Citizen'
            });

            const role = interaction.guild.roles.cache.get(CITY_ROLE_ID);

            if (role) {
                await interaction.member.roles.add(role).catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setColor('#D4AF37')
                .setTitle('🌆 تم إنشاء شخصيتك بنجاح')
                .setDescription(
                    `مرحبًا بك في **NEXUS CITY**.\n\n` +
                    `👤 الاسم: **${characterName}**\n` +
                    `🎂 العمر: **${age}**\n` +
                    `🌍 الجنسية: **${nationality}**\n` +
                    `🏛️ الفصيل: **Civilian**\n\n` +
                    `💵 الرصيد: **500 Nexus Dollars**\n` +
                    `🏦 البنك: **0 Nexus Dollars**\n\n` +
                    `تم منحك رتبة **City Citizen**.`
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: 'NEXUS CITY • Welcome Citizen' })
                .setTimestamp();

            return interaction.reply({
                embeds: [embed]
            });
        }
    }
};