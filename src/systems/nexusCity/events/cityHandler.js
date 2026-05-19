const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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
        .setMaxLength(25);

    const ageInput = new TextInputBuilder()
        .setCustomId('character_age')
        .setLabel('العمر')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const nationalityInput = new TextInputBuilder()
        .setCustomId('character_nationality')
        .setLabel('الجنسية')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const storyInput = new TextInputBuilder()
        .setCustomId('character_story')
        .setLabel('نبذة عن الشخصية')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(300);

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

        /*
        =========================
        BUTTONS
        =========================
        */

        if (interaction.isButton()) {

            /*
            =========================
            CREATE CHARACTER
            =========================
            */

            if (interaction.customId === 'city_create_character') {

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

            /*
            =========================
            FACTION MEMBERS
            =========================
            */

            if (interaction.customId === 'city_faction_members') {

                const player = await CityPlayer.findOne({
                    userId: interaction.user.id
                });

                if (!player) {
                    return interaction.reply({
                        content: '❌ لا تملك شخصية.',
                        flags: 64
                    });
                }

                if (!['Leader', 'Deputy'].includes(player.factionRank)) {
                    return interaction.reply({
                        content: '❌ هذه اللوحة للقادة والنواب فقط.',
                        flags: 64
                    });
                }

                const members = await CityPlayer.find({
                    faction: player.faction
                });

                const formatted = members.map((m, index) =>
                    `**${index + 1}.** ${m.characterName} — ${m.factionRank}`
                ).join('\n');

                const embed = new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle(`👥 أعضاء ${player.faction}`)
                    .setDescription(
                        formatted || 'لا يوجد أعضاء.'
                    )
                    .setFooter({
                        text: `عدد الأعضاء: ${members.length}`
                    });

                return interaction.reply({
                    embeds: [embed],
                    flags: 64
                });
            }

            /*
            =========================
            COMING SOON BUTTONS
            =========================
            */

            const comingSoonButtons = [
                'city_faction_invite',
                'city_faction_kick',
                'city_faction_promote',
                'city_faction_demote'
            ];

            if (comingSoonButtons.includes(interaction.customId)) {
                return interaction.reply({
                    content: '🚧 هذه الميزة قيد التطوير حاليًا.',
                    flags: 64
                });
            }
        }

        /*
        =========================
        MODALS
        =========================
        */

        if (interaction.isModalSubmit()) {

            /*
            =========================
            CREATE CHARACTER MODAL
            =========================
            */

            if (interaction.customId === 'city_create_character_modal') {

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

                const ageRaw =
                    interaction.fields.getTextInputValue('character_age');

                const nationality =
                    interaction.fields.getTextInputValue('character_nationality');

                const story =
                    interaction.fields.getTextInputValue('character_story') || 'No story';

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

                const role =
                    interaction.guild.roles.cache.get(CITY_ROLE_ID);

                if (role) {
                    await interaction.member.roles.add(role).catch(() => {});
                }

                const embed = new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle('🌆 تم إنشاء شخصيتك بنجاح')
                    .setDescription(
                        `👤 الاسم: **${characterName}**\n` +
                        `🎂 العمر: **${age}**\n` +
                        `🌍 الجنسية: **${nationality}**\n\n` +
                        `💵 حصلت على:\n` +
                        `500 Nexus Dollars`
                    )
                    .setThumbnail(
                        interaction.user.displayAvatarURL()
                    )
                    .setFooter({
                        text: 'NEXUS CITY • Welcome'
                    })
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed]
                });
            }
        }
    }
};