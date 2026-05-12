const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} = require('discord.js');

const ticketDB = require('../utils/ticketDB');
const staffStatsDB = require('../utils/staffStatsDB');
const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');

const LOG_CHANNEL_ID = '1501336819151933510';
const STAFF_ROLE_ID = '1436501394705354852';

function isStaff(member) {
    return member.roles.cache.has(STAFF_ROLE_ID) ||
        member.permissions.has(PermissionFlagsBits.ManageChannels);
}

function defaultButtonsRow() {
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

function claimedButtonsRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_claim_disabled')
            .setLabel('تم الاستلام')
            .setEmoji('🟢')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),

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

function optionsRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_unclaim')
            .setLabel('إلغاء المطالبة')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('ticket_remind')
            .setLabel('إرسال تذكير')
            .setEmoji('🔔')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('ticket_add_user')
            .setLabel('إضافة شخص')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('ticket_remove_user')
            .setLabel('إزالة شخص')
            .setEmoji('➖')
            .setStyle(ButtonStyle.Danger)
    );
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        if (interaction.isButton()) {
            if (
                !interaction.customId.startsWith('view_ticket_') &&
                !interaction.customId.startsWith('ticket_rate_') &&
                ![
                    'ticket_claim',
                    'ticket_close',
                    'ticket_options',
                    'ticket_unclaim',
                    'ticket_remind',
                    'ticket_add_user',
                    'ticket_remove_user'
                ].includes(interaction.customId)
            ) return;

            if (interaction.customId.startsWith('view_ticket_')) {
                const ticketId = interaction.customId.replace('view_ticket_', '');
                const data = ticketDB.readData();
                const ticket = data.tickets.find(t => t.id === ticketId);

                if (!ticket) {
                    return interaction.reply({
                        embeds: [createEmbed({
                            title: '❌ NEXUS Ticket System',
                            description: 'لم يتم العثور على التذكرة.',
                            thumbnail: client.user.displayAvatarURL()
                        })],
                        flags: 64
                    });
                }

                const transcriptText = ticket.transcript && ticket.transcript.length
                    ? ticket.transcript.map(msg => `**${msg.author}:** ${msg.content}`).join('\n')
                    : 'لا توجد رسائل محفوظة';

                const finalText = transcriptText.length > 1800
                    ? transcriptText.slice(0, 1800) + '\n\n...تم اختصار السجل'
                    : transcriptText;

                return interaction.reply({
                    embeds: [createEmbed({
                        title: `📖 NEXUS Ticket Transcript #${ticket.id}`,
                        description: finalText,
                        fields: [
                            { name: '👤 صاحب التذكرة', value: `<@${ticket.userId}>`, inline: true },
                            { name: '📂 النوع', value: `\`${ticket.type || 'غير معروف'}\``, inline: true },
                            { name: '🔒 سبب الإغلاق', value: ticket.closeReason || 'غير محدد', inline: false }
                        ],
                        thumbnail: client.user.displayAvatarURL()
                    })],
                    flags: 64
                });
            }

            if (interaction.customId.startsWith('ticket_rate_')) {
                const parts = interaction.customId.split('_');
                const rating = parts[2];
                const ticketId = parts[3];

                const data = ticketDB.readData();
                const ticket = data.tickets.find(t => t.id === ticketId);

                if (!ticket) {
                    return interaction.reply({
                        embeds: [createEmbed({
                            title: '❌ NEXUS Ticket System',
                            description: 'لم يتم العثور على التذكرة.',
                            thumbnail: client.user.displayAvatarURL()
                        })],
                        flags: 64
                    });
                }

                if (interaction.user.id !== ticket.userId) {
                    return interaction.reply({
                        embeds: [createEmbed({
                            title: '🚫 NEXUS Ticket Rating',
                            description: 'فقط صاحب التذكرة يستطيع التقييم.',
                            thumbnail: client.user.displayAvatarURL()
                        })],
                        flags: 64
                    });
                }

                if (ticket.rating) {
                    return interaction.reply({
                        embeds: [createEmbed({
                            title: '⚠️ NEXUS Ticket Rating',
                            description: 'تم تقييم هذه التذكرة مسبقًا.',
                            thumbnail: client.user.displayAvatarURL()
                        })],
                        flags: 64
                    });
                }

                const updatedTicket = ticketDB.updateTicket(ticketId, {
                    rating,
                    ratingBy: interaction.user.tag,
                    ratingById: interaction.user.id,
                    ratingAt: new Date().toLocaleString()
                });

                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

                if (logChannel && updatedTicket.logMessageId) {
                    const logMessage = await logChannel.messages.fetch(updatedTicket.logMessageId).catch(() => null);

                    if (logMessage) {
                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`view_ticket_${updatedTicket.id}`)
                                .setLabel('عرض التذكرة')
                                .setEmoji('📖')
                                .setStyle(ButtonStyle.Primary)
                        );

                        await logMessage.edit({
                            embeds: [createEmbed({
                                title: `📁 NEXUS Ticket Archive #${updatedTicket.id}`,
                                description: 'تم تحديث أرشيف التذكرة بعد إضافة التقييم.',
                                fields: [
                                    { name: '👤 صاحب التذكرة', value: `<@${updatedTicket.userId}>`, inline: true },
                                    { name: '📂 النوع', value: `\`${updatedTicket.type}\``, inline: true },
                                    { name: '🟢 المستلم', value: updatedTicket.claimedById ? `<@${updatedTicket.claimedById}>` : 'لم يتم الاستلام', inline: true },
                                    { name: '🔒 المغلق', value: updatedTicket.closedById ? `<@${updatedTicket.closedById}>` : 'غير معروف', inline: true },
                                    { name: '⭐ التقييم', value: `${'⭐'.repeat(Number(rating))} (${rating}/5)`, inline: true },
                                    { name: '🔒 سبب الإغلاق', value: updatedTicket.closeReason || 'غير محدد', inline: false }
                                ],
                                thumbnail: client.user.displayAvatarURL()
                            })],
                            components: [row]
                        });
                    }
                }

                return interaction.update({
                    embeds: [createEmbed({
                        title: '✅ NEXUS Ticket Rating',
                        description: `شكرًا لك، تم تسجيل تقييمك: ${'⭐'.repeat(Number(rating))} (${rating}/5)`,
                        thumbnail: client.user.displayAvatarURL()
                    })],
                    content: null,
                    components: []
                });
            }

            const ticket = ticketDB.findTicketByChannel(interaction.channel.name, interaction.channel.id);

            if (!ticket) {
                return interaction.reply({
                    embeds: [createEmbed({
                        title: '❌ NEXUS Ticket System',
                        description: 'لم يتم العثور على بيانات التذكرة.',
                        thumbnail: client.user.displayAvatarURL()
                    })],
                    flags: 64
                });
            }

            if (interaction.user.id === ticket.userId) {
                return interaction.reply({
                    embeds: [createEmbed({
                        title: '🚫 NEXUS Ticket System',
                        description: 'لا يمكنك استخدام أزرار الإدارة على تذكرتك الخاصة.',
                        thumbnail: client.user.displayAvatarURL()
                    })],
                    flags: 64
                });
            }

            if (!isStaff(interaction.member)) {
                return interaction.reply({
                    embeds: [createEmbed({
                        title: '🚫 NEXUS Permission System',
                        description: 'هذه الخيارات مخصصة لفريق التذاكر فقط.',
                        thumbnail: client.user.displayAvatarURL()
                    })],
                    flags: 64
                });
            }

            if (interaction.customId === 'ticket_claim') {
                if (ticket.claimedBy) {
                    return interaction.reply({
                        embeds: [createEmbed({
                            title: '⚠️ NEXUS Ticket System',
                            description: `التذكرة مستلمة بالفعل بواسطة <@${ticket.claimedById}>.`,
                            thumbnail: client.user.displayAvatarURL()
                        })],
                        flags: 64
                    });
                }

                ticketDB.updateTicket(ticket.id, {
                    claimedBy: interaction.user.tag,
                    claimedById: interaction.user.id,
                    claimedAt: new Date().toLocaleString()
                });

                staffStatsDB.addTicketClaim(interaction.user.id);

                await interaction.message.edit({
                    components: [claimedButtonsRow()]
                }).catch(() => {});

                logger.info(`${interaction.user.tag} claimed ticket #${ticket.id}`);

                return interaction.reply({
                    embeds: [createEmbed({
                        title: '🟢 NEXUS Ticket Claimed',
                        description: `تم استلام التذكرة بواسطة ${interaction.user}.`,
                        fields: [
                            { name: '🎫 Ticket ID', value: `\`#${ticket.id}\``, inline: true },
                            { name: '🛡️ المستلم', value: `${interaction.user}`, inline: true }
                        ],
                        thumbnail: interaction.user.displayAvatarURL()
                    })]
                });
            }

            if (interaction.customId === 'ticket_options') {
                return interaction.reply({
                    embeds: [createEmbed({
                        title: '⚙️ NEXUS Ticket Options',
                        description: 'اختر الإجراء المطلوب من الأزرار بالأسفل.',
                        fields: [
                            { name: '🎫 Ticket ID', value: `\`#${ticket.id}\``, inline: true },
                            { name: '🟢 المستلم', value: ticket.claimedById ? `<@${ticket.claimedById}>` : 'لم يتم الاستلام', inline: true }
                        ],
                        thumbnail: client.user.displayAvatarURL()
                    })],
                    components: [optionsRow()],
                    flags: 64
                });
            }

            if (interaction.customId === 'ticket_unclaim') {
                if (!ticket.claimedById) {
                    return interaction.reply({
                        embeds: [createEmbed({
                            title: '⚠️ NEXUS Ticket System',
                            description: 'هذه التذكرة غير مستلمة حاليًا.',
                            thumbnail: client.user.displayAvatarURL()
                        })],
                        flags: 64
                    });
                }

                ticketDB.updateTicket(ticket.id, {
                    claimedBy: null,
                    claimedById: null,
                    claimedAt: null
                });

                const firstMessage = await interaction.channel.messages.fetch({ limit: 10 })
                    .then(messages => messages.find(msg => msg.author.id === client.user.id && msg.components.length))
                    .catch(() => null);

                if (firstMessage) {
                    await firstMessage.edit({
                        components: [defaultButtonsRow()]
                    }).catch(() => {});
                }

                logger.info(`${interaction.user.tag} unclaimed ticket #${ticket.id}`);

                return interaction.reply({
                    embeds: [createEmbed({
                        title: '🔄 NEXUS Ticket Unclaimed',
                        description: `تم إلغاء استلام التذكرة بواسطة ${interaction.user}.`,
                        thumbnail: interaction.user.displayAvatarURL()
                    })]
                });
            }

            if (interaction.customId === 'ticket_remind') {
                return interaction.reply({
                    content: `<@${ticket.userId}>`,
                    embeds: [createEmbed({
                        title: '🔔 NEXUS Ticket Reminder',
                        description: 'الإداري بانتظار ردك داخل التذكرة.',
                        fields: [
                            { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                            { name: '🎫 Ticket ID', value: `\`#${ticket.id}\``, inline: true }
                        ],
                        thumbnail: client.user.displayAvatarURL()
                    })]
                });
            }

            if (interaction.customId === 'ticket_add_user') {
                const modal = new ModalBuilder()
                    .setCustomId(`ticket_add_user_modal_${ticket.id}`)
                    .setTitle('إضافة شخص للتذكرة');

                const input = new TextInputBuilder()
                    .setCustomId('user_id')
                    .setLabel('اكتب ID الشخص')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('مثال: 123456789012345678');

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                return interaction.showModal(modal);
            }

            if (interaction.customId === 'ticket_remove_user') {
                const modal = new ModalBuilder()
                    .setCustomId(`ticket_remove_user_modal_${ticket.id}`)
                    .setTitle('إزالة شخص من التذكرة');

                const input = new TextInputBuilder()
                    .setCustomId('user_id')
                    .setLabel('اكتب ID الشخص')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('مثال: 123456789012345678');

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                return interaction.showModal(modal);
            }

            if (interaction.customId === 'ticket_close') {
                const modal = new ModalBuilder()
                    .setCustomId(`ticket_close_reason_${ticket.id}`)
                    .setTitle('إغلاق التذكرة');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('close_reason')
                    .setLabel('سبب إغلاق التذكرة')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('اكتب سبب الإغلاق هنا...')
                    .setRequired(true)
                    .setMaxLength(500);

                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

                return interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit()) {
            if (
                !interaction.customId.startsWith('ticket_close_reason_') &&
                !interaction.customId.startsWith('ticket_add_user_modal_') &&
                !interaction.customId.startsWith('ticket_remove_user_modal_')
            ) return;

            if (interaction.customId.startsWith('ticket_add_user_modal_')) {
                await interaction.deferReply({ flags: 64 });

                const userId = interaction.fields.getTextInputValue('user_id').trim();

                await interaction.channel.permissionOverwrites.edit(userId, {
                    ViewChannel: true,
                    ReadMessageHistory: true,
                    SendMessages: true,
                    AttachFiles: true,
                    EmbedLinks: true
                }).catch(() => null);

                return interaction.editReply({
                    embeds: [createEmbed({
                        title: '➕ NEXUS Ticket System',
                        description: `تمت إضافة <@${userId}> إلى التذكرة.`,
                        thumbnail: client.user.displayAvatarURL()
                    })]
                });
            }

            if (interaction.customId.startsWith('ticket_remove_user_modal_')) {
                await interaction.deferReply({ flags: 64 });

                const userId = interaction.fields.getTextInputValue('user_id').trim();

                await interaction.channel.permissionOverwrites.delete(userId).catch(() => null);

                return interaction.editReply({
                    embeds: [createEmbed({
                        title: '➖ NEXUS Ticket System',
                        description: `تمت إزالة <@${userId}> من التذكرة.`,
                        thumbnail: client.user.displayAvatarURL()
                    })]
                });
            }

            if (interaction.customId.startsWith('ticket_close_reason_')) {
                await interaction.deferReply();

                const ticketId = interaction.customId.replace('ticket_close_reason_', '');
                const closeReason = interaction.fields.getTextInputValue('close_reason');

                const data = ticketDB.readData();
                const ticket = data.tickets.find(t => t.id === ticketId);

                if (!ticket) {
                    return interaction.editReply({
                        embeds: [createEmbed({
                            title: '❌ NEXUS Ticket System',
                            description: 'لم يتم العثور على بيانات التذكرة.',
                            thumbnail: client.user.displayAvatarURL()
                        })]
                    });
                }

                const messages = await interaction.channel.messages.fetch({ limit: 100 });

                const transcript = messages
                    .reverse()
                    .map(msg => ({
                        author: msg.author.tag,
                        content: msg.content || '[مرفق/Embed]',
                        createdAt: msg.createdAt.toLocaleString()
                    }));

                const updatedTicket = ticketDB.updateTicket(ticket.id, {
                    transcript,
                    status: 'CLOSED',
                    closedBy: interaction.user.tag,
                    closedById: interaction.user.id,
                    closeReason,
                    closedAt: new Date().toLocaleString()
                });

                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

                const viewRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`view_ticket_${updatedTicket.id}`)
                        .setLabel('عرض التذكرة')
                        .setEmoji('📖')
                        .setStyle(ButtonStyle.Primary)
                );

                if (logChannel) {
                    const logMessage = await logChannel.send({
                        embeds: [createEmbed({
                            title: `📁 NEXUS Ticket Archive #${updatedTicket.id}`,
                            description: 'تم إغلاق تذكرة وحفظ بياناتها داخل Discord.',
                            fields: [
                                { name: '👤 صاحب التذكرة', value: `<@${updatedTicket.userId}>`, inline: true },
                                { name: '📂 النوع', value: `\`${updatedTicket.type}\``, inline: true },
                                { name: '🟢 المستلم', value: updatedTicket.claimedById ? `<@${updatedTicket.claimedById}>` : 'لم يتم الاستلام', inline: true },
                                { name: '🔒 المغلق', value: `<@${interaction.user.id}>`, inline: true },
                                { name: '⭐ التقييم', value: 'لم يتم التقييم بعد', inline: true },
                                { name: '🔒 سبب الإغلاق', value: closeReason, inline: false },
                                { name: '📅 الإنشاء', value: updatedTicket.createdAt || 'غير معروف', inline: true },
                                { name: '📅 الإغلاق', value: updatedTicket.closedAt || 'غير معروف', inline: true }
                            ],
                            thumbnail: client.user.displayAvatarURL()
                        })],
                        components: [viewRow]
                    });

                    ticketDB.updateTicket(updatedTicket.id, {
                        logMessageId: logMessage.id
                    });
                }

                const ratingRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`ticket_rate_1_${updatedTicket.id}`).setLabel('1').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`ticket_rate_2_${updatedTicket.id}`).setLabel('2').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`ticket_rate_3_${updatedTicket.id}`).setLabel('3').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`ticket_rate_4_${updatedTicket.id}`).setLabel('4').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`ticket_rate_5_${updatedTicket.id}`).setLabel('5').setEmoji('⭐').setStyle(ButtonStyle.Success)
                );

                await interaction.channel.send({
                    content: `<@${updatedTicket.userId}>`,
                    embeds: [createEmbed({
                        title: '⭐ NEXUS Ticket Rating',
                        description: 'الرجاء تقييم تعامل الإداري مع التذكرة.',
                        thumbnail: client.user.displayAvatarURL()
                    })],
                    components: [ratingRow]
                });

                await interaction.editReply({
                    embeds: [createEmbed({
                        title: '🔒 NEXUS Ticket Closed',
                        description: 'تم إغلاق التذكرة. سيتم حذف الروم بعد 30 ثانية.',
                        fields: [
                            { name: '🎫 Ticket ID', value: `\`#${updatedTicket.id}\``, inline: true },
                            { name: '🔒 المغلق', value: `${interaction.user}`, inline: true },
                            { name: '📌 سبب الإغلاق', value: closeReason, inline: false }
                        ],
                        thumbnail: client.user.displayAvatarURL()
                    })]
                });

                logger.info(`${interaction.user.tag} closed ticket #${updatedTicket.id} | Reason: ${closeReason}`);

                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 30000);
            }
        }
    }
};