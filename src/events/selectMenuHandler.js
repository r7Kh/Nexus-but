const {
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const ticketDB = require('../utils/ticketDB');
const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');

const STAFF_ROLE_ID = '1436501394705354852';
const TICKET_CATEGORY_ID = '1429135732135432336';
const TICKET_LOG_CHANNEL_ID = '1501336819151933510';

const ticketNames = {
    player_report: 'شكوى ضد لاعب',
    admin_report: 'شكوى ضد إداري',
    support: 'الدعم الفني',
    role_apply: 'تقديم على Role'
};

const ticketEmojis = {
    player_report: '📗',
    admin_report: '📘',
    support: '🛠️',
    role_apply: '🎭'
};

const ticketChannelPrefixes = {
    player_report: 'player',
    admin_report: 'admin',
    support: 'support',
    role_apply: 'role'
};

const ticketInstructions = {
    player_report: `
يرجى تعبئة المعلومات التالية:

• اسمك داخل اللعبة:
• ID الخاص بك:
• اسم اللاعب المشتكى عليه:
• ID اللاعب:
• شرح المشكلة:
• الأدلة / الصور / الفيديو:
    `,
    admin_report: `
يرجى تعبئة المعلومات التالية:

• اسمك داخل اللعبة:
• ID الخاص بك:
• اسم الإداري:
• سبب الشكوى:
• شرح المشكلة بالتفصيل:
• الأدلة / الصور / الفيديو:
    `,
    support: `
يرجى تعبئة المعلومات التالية:

• نوع المشكلة:
• شرح المشكلة:
• متى بدأت المشكلة:
• هل لديك صور أو فيديو؟
    `,
    role_apply: `
يرجى تعبئة المعلومات التالية:

• اسمك:
• الرتبة المطلوبة:
• سبب طلب الرتبة:
• خبرتك أو سبب استحقاقك:
    `
};

function ticketButtonsRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('استلام التذكرة')
            .setEmoji('🟢')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('ticket_options')
            .setLabel('خيارات التذكرة')
            .setEmoji('⚙️')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('إغلاق التذكرة')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
    );
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'ticket_select') return;

        await interaction.deferReply({ flags: 64 });

        const ticketType = interaction.values[0];

        if (!ticketNames[ticketType]) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Ticket System',
                        description: 'نوع التذكرة غير صحيح.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        const existingChannel = interaction.guild.channels.cache.find(
            channel => channel.topic === interaction.user.id && channel.parentId === TICKET_CATEGORY_ID
        );

        if (existingChannel) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '⚠️ NEXUS Ticket System',
                        description: `لديك تذكرة مفتوحة بالفعل: ${existingChannel}`,
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        const savedTicket = ticketDB.createTicket({
            userId: interaction.user.id,
            username: interaction.user.tag,
            type: ticketNames[ticketType],
            ticketType
        });

        const channelPrefix = ticketChannelPrefixes[ticketType] || 'ticket';

        const channel = await interaction.guild.channels.create({
            name: `${channelPrefix}-${savedTicket.id}`,
            parent: TICKET_CATEGORY_ID,
            topic: interaction.user.id,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks
                    ]
                },
                {
                    id: STAFF_ROLE_ID,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ManageMessages
                    ]
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ManageRoles
                    ]
                }
            ]
        });

        ticketDB.updateTicket(savedTicket.id, {
            channelId: channel.id,
            channelName: channel.name
        });

        await channel.send({
            content: `<@&${STAFF_ROLE_ID}> ${interaction.user}`,
            embeds: [
                createEmbed({
                    title: `${ticketEmojis[ticketType]} NEXUS Ticket #${savedTicket.id}`,
                    description: `
تم إنشاء تذكرة جديدة بنجاح.

${ticketInstructions[ticketType]}
                    `,
                    fields: [
                        {
                            name: '👤 صاحب التذكرة',
                            value: `${interaction.user}`,
                            inline: true
                        },
                        {
                            name: '📂 نوع التذكرة',
                            value: `\`${ticketNames[ticketType]}\``,
                            inline: true
                        },
                        {
                            name: '🆔 Ticket ID',
                            value: `\`#${savedTicket.id}\``,
                            inline: true
                        }
                    ],
                    thumbnail: interaction.user.displayAvatarURL()
                })
            ],
            components: [ticketButtonsRow()]
        });

        const logChannel = interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL_ID);

        if (logChannel) {
            await logChannel.send({
                embeds: [
                    createEmbed({
                        title: `🎫 Ticket Opened #${savedTicket.id}`,
                        description: 'تم فتح تذكرة جديدة داخل السيرفر.',
                        fields: [
                            {
                                name: '👤 صاحب التذكرة',
                                value: `${interaction.user}`,
                                inline: true
                            },
                            {
                                name: '📂 نوع التذكرة',
                                value: `\`${ticketNames[ticketType]}\``,
                                inline: true
                            },
                            {
                                name: '📍 الروم',
                                value: `${channel}`,
                                inline: true
                            }
                        ],
                        thumbnail: interaction.user.displayAvatarURL()
                    })
                ]
            });
        }

        logger.info(`${interaction.user.tag} opened ticket #${savedTicket.id} | Type: ${ticketNames[ticketType]}`);

        return interaction.editReply({
            embeds: [
                createEmbed({
                    title: '✅ NEXUS Ticket System',
                    description: `تم إنشاء تذكرتك بنجاح: ${channel}`,
                    thumbnail: client.user.displayAvatarURL()
                })
            ]
        });
    }
};