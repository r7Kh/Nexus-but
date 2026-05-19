const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    UserSelectMenuBuilder
} = require('discord.js');

const CityPlayer = require('../models/CityPlayer');

const CITY_ROLE_ID = '1506231341455511642';

const FACTIONS = {
    Police: {
        label: '🚓 الشرطة',
        baseRole: '1506050074009014313'
    },
    Gang: {
        label: '🕶️ العصابات',
        baseRole: '1506050734708494356'
    },
    Medical: {
        label: '🏥 الطب',
        baseRole: '1506050976837144706'
    },
    'Fire Department': {
        label: '🚒 الإطفاء',
        baseRole: '1506051184471969926'
    },
    'Cyber Security': {
        label: '💻 الأمن السيبراني',
        baseRole: '1506051347047383220'
    }
};

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

async function getFactionManager(userId) {
    const player = await CityPlayer.findOne({ userId });

    if (!player) return null;
    if (!['Leader', 'Deputy'].includes(player.factionRank)) return null;
    if (player.faction === 'Civilian') return null;

    return player;
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {

        if (interaction.isButton()) {

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

            if (interaction.customId === 'city_faction_members') {
                const manager = await getFactionManager(interaction.user.id);

                if (!manager) {
                    return interaction.reply({
                        content: '❌ هذه اللوحة للقادة والنواب فقط.',
                        flags: 64
                    });
                }

                const members = await CityPlayer.find({
                    faction: manager.faction
                });

                const formatted = members.map((m, index) =>
                    `**${index + 1}.** <@${m.userId}> — **${m.characterName}** — \`${m.factionRank}\``
                ).join('\n');

                const embed = new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle(`👥 أعضاء ${FACTIONS[manager.faction]?.label || manager.faction}`)
                    .setDescription(formatted || 'لا يوجد أعضاء.')
                    .setFooter({ text: `عدد الأعضاء: ${members.length}` });

                return interaction.reply({
                    embeds: [embed],
                    flags: 64
                });
            }

            if (interaction.customId === 'city_faction_invite') {
                const manager = await getFactionManager(interaction.user.id);

                if (!manager) {
                    return interaction.reply({
                        content: '❌ هذه الميزة للقائد والنائب فقط.',
                        flags: 64
                    });
                }

                const menu = new UserSelectMenuBuilder()
                    .setCustomId(`city_faction_invite_select_${manager.faction}`)
                    .setPlaceholder('اختر العضو الذي تريد دعوته للفصيل')
                    .setMinValues(1)
                    .setMaxValues(1);

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#D4AF37')
                            .setTitle('➕ دعوة عضو للفصيل')
                            .setDescription(
                                `🏛️ الفصيل: **${FACTIONS[manager.faction]?.label || manager.faction}**\n\n` +
                                `اختر العضو من القائمة بالأسفل.`
                            )
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(menu)
                    ],
                    flags: 64
                });
            }

            const comingSoonButtons = [
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

        if (interaction.isUserSelectMenu()) {
            if (interaction.customId.startsWith('city_faction_invite_select_')) {
                const factionKey = interaction.customId.replace('city_faction_invite_select_', '');
                const manager = await getFactionManager(interaction.user.id);

                if (!manager || manager.faction !== factionKey) {
                    return interaction.reply({
                        content: '❌ لا يمكنك دعوة أعضاء لهذا الفصيل.',
                        flags: 64
                    });
                }

                const selectedUserId = interaction.values[0];
                const targetUser = await client.users.fetch(selectedUserId).catch(() => null);
                const targetMember = await interaction.guild.members.fetch(selectedUserId).catch(() => null);

                if (!targetUser || !targetMember) {
                    return interaction.reply({
                        content: '❌ لم أستطع العثور على العضو.',
                        flags: 64
                    });
                }

                const targetPlayer = await CityPlayer.findOne({ userId: selectedUserId });

                if (!targetPlayer) {
                    return interaction.reply({
                        content: '❌ هذا العضو لا يملك شخصية داخل NEXUS CITY.',
                        flags: 64
                    });
                }

                if (targetPlayer.faction !== 'Civilian') {
                    return interaction.reply({
                        content: '❌ هذا العضو منضم لفصيل بالفعل.',
                        flags: 64
                    });
                }

                const faction = FACTIONS[factionKey];

                if (!faction) {
                    return interaction.reply({
                        content: '❌ الفصيل غير صحيح.',
                        flags: 64
                    });
                }

                await targetMember.roles.add(faction.baseRole).catch(() => {});
                await targetMember.roles.add('1506215568317874206').catch(() => {});

                targetPlayer.faction = factionKey;
                targetPlayer.factionRank = 'Member';
                targetPlayer.inDuty = false;

                await targetPlayer.save();

                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF88')
                            .setTitle('✅ تم قبول العضو في الفصيل')
                            .setDescription(
                                `تمت إضافة ${targetUser} إلى الفصيل بنجاح.\n\n` +
                                `🏛️ الفصيل: **${faction.label}**\n` +
                                `🎖️ الرتبة: **Member**\n` +
                                `🔴 الحالة: **خارج الخدمة**`
                            )
                            .setThumbnail(targetUser.displayAvatarURL())
                            .setTimestamp()
                    ],
                    components: []
                });
            }
        }

        if (interaction.isModalSubmit()) {

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