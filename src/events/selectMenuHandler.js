const {
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const ticketDB = require('../utils/ticketDB');

const STAFF_ROLE_ID = '1436501394705354852';
const TICKET_CATEGORY_ID = '1429135732135432336';

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'ticket_select') return;

        await interaction.deferReply({ flags: 64 });

        const ticketType = interaction.values[0];

        const ticketNames = {
            player_report: 'شكوى-لاعب',
            admin_report: 'شكوى-إداري',
            gang_report: 'شكوى-قيادة',
            support: 'دعم-فني',
            alliance: 'قائد-التحالف',
            staff_apply: 'تقديم-إدارة'
        };

        const existingChannel = interaction.guild.channels.cache.find(
            channel => channel.topic === interaction.user.id && channel.parentId === TICKET_CATEGORY_ID
        );

        if (existingChannel) {
            return interaction.editReply({
                content: '❌ لديك تذكرة مفتوحة بالفعل'
            });
        }

        const savedTicket = ticketDB.createTicket({
            userId: interaction.user.id,
            username: interaction.user.tag,
            type: ticketNames[ticketType]
        });

        const channel = await interaction.guild.channels.create({
            name: `ticket-${savedTicket.id}`,
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
                        PermissionFlagsBits.EmbedLinks
                    ]
                }
            ]
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_claim')
                .setLabel('استلام التذكرة')
                .setEmoji('🟢')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('إغلاق التذكرة')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({
            content: `
<@&${STAFF_ROLE_ID}>

🎫 **تذكرة جديدة #${savedTicket.id}**

👤 صاحب التذكرة: ${interaction.user}
📂 النوع: ${ticketNames[ticketType]}

يرجى شرح مشكلتك بالتفصيل وانتظار الإدارة.
            `,
            components: [row]
        });

        return interaction.editReply({
            content: `✅ تم إنشاء تذكرتك: ${channel}`
        });
    }
};