const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const createEmbed = require('../utils/embed');
const ticketDB = require('../utils/ticketDB');

const STAFF_ROLE_ID = '1436501394705354852';
const TICKET_LOG_CHANNEL_ID = '1501336819151933510';
const TRANSCRIPTS_DIR = path.join(__dirname, '../database/transcripts');

function ensureTranscriptDir() {
    if (!fs.existsSync(TRANSCRIPTS_DIR)) {
        fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
    }
}

function isStaff(member) {
    return (
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        member.roles.cache.has(STAFF_ROLE_ID)
    );
}

function ticketButtonsRow(claimed = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel(claimed ? 'تم الاستلام' : 'استلام التذكرة')
            .setEmoji('🟢')
            .setStyle(ButtonStyle.Success)
            .setDisabled(claimed),

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

function optionsRows() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_add_member')
                .setLabel('إضافة عضو')
                .setEmoji('👤')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('ticket_remove_member')
                .setLabel('إزالة عضو')
                .setEmoji('🚫')
                .setStyle(ButtonStyle.Secondary)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_save_html')
                .setLabel('حفظ HTML')
                .setEmoji('📁')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('إغلاق التذكرة')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        )
    ];
}

function ratingRow(ticketId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket_rate_1_${ticketId}`)
            .setLabel('1')
            .setEmoji('⭐')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`ticket_rate_2_${ticketId}`)
            .setLabel('2')
            .setEmoji('⭐')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`ticket_rate_3_${ticketId}`)
            .setLabel('3')
            .setEmoji('⭐')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId(`ticket_rate_4_${ticketId}`)
            .setLabel('4')
            .setEmoji('⭐')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`ticket_rate_5_${ticketId}`)
            .setLabel('5')
            .setEmoji('⭐')
            .setStyle(ButtonStyle.Success)
    );
}

function disabledRatingRow(ticketId, selectedRating) {
    return new ActionRowBuilder().addComponents(
        [1, 2, 3, 4, 5].map(rate =>
            new ButtonBuilder()
                .setCustomId(`ticket_rate_disabled_${rate}_${ticketId}`)
                .setLabel(String(rate))
                .setEmoji(rate === selectedRating ? '✅' : '⭐')
                .setStyle(rate === selectedRating ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(true)
        )
    );
}

function escapeHtml(text = '') {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function extractUserId(input = '') {
    const match = input.match(/\d{17,20}/);
    return match ? match[0] : null;
}

function memberModal(customId, title) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);

    const input = new TextInputBuilder()
        .setCustomId('member_id')
        .setLabel('حط ID العضو أو منشن العضو')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('مثال: 123456789012345678 أو @user');

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    return modal;
}

async function createTranscript(channel, ticketId) {
    ensureTranscriptDir();

    const messages = [];
    let lastId = null;

    while (true) {
        const fetched = await channel.messages.fetch({
            limit: 100,
            ...(lastId ? { before: lastId } : {})
        });

        if (!fetched.size) break;

        messages.push(...fetched.values());
        lastId = fetched.last().id;

        if (fetched.size < 100) break;
    }

    messages.reverse();

    const htmlMessages = messages.map(msg => {
        const attachments = [...msg.attachments.values()]
            .map(a => `<a href="${a.url}" target="_blank">${escapeHtml(a.name || a.url)}</a>`)
            .join('<br>');

        const embeds = msg.embeds?.length
            ? msg.embeds.map(e => {
                const title = e.title ? `<strong>${escapeHtml(e.title)}</strong><br>` : '';
                const desc = e.description ? `${escapeHtml(e.description).replaceAll('\n', '<br>')}` : '';
                return `<div class="embed">${title}${desc}</div>`;
            }).join('<br>')
            : '';

        return `
        <div class="message">
            <img class="avatar" src="${msg.author.displayAvatarURL()}" />
            <div class="content">
                <div class="meta">
                    <span class="author">${escapeHtml(msg.author.tag)}</span>
                    <span class="time">${new Date(msg.createdTimestamp).toLocaleString()}</span>
                </div>
                <div class="text">${escapeHtml(msg.content || '').replaceAll('\n', '<br>')}</div>
                ${embeds}
                ${attachments ? `<div class="attachments">${attachments}</div>` : ''}
            </div>
        </div>`;
    }).join('\n');

    const html = `
<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8" />
<title>NEXUS Ticket #${ticketId}</title>
<style>
body {
    background: #111;
    color: #eee;
    font-family: Arial, sans-serif;
    padding: 20px;
}
.header {
    background: #1f1f1f;
    border-left: 5px solid #d4af37;
    padding: 20px;
    margin-bottom: 20px;
    border-radius: 10px;
}
.message {
    display: flex;
    gap: 12px;
    background: #1b1b1b;
    padding: 12px;
    margin-bottom: 10px;
    border-radius: 10px;
}
.avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
}
.author {
    color: #d4af37;
    font-weight: bold;
}
.time {
    color: #888;
    font-size: 12px;
    margin-left: 10px;
}
.text {
    margin-top: 6px;
    line-height: 1.5;
}
.embed {
    margin-top: 8px;
    padding: 10px;
    border-left: 4px solid #d4af37;
    background: #252525;
    border-radius: 6px;
}
.attachments {
    margin-top: 8px;
}
a {
    color: #6ab7ff;
}
</style>
</head>
<body>
<div class="header">
    <h1>🎫 NEXUS Ticket #${ticketId}</h1>
    <p>Channel: ${escapeHtml(channel.name)}</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
</div>
${htmlMessages}
</body>
</html>`;

    const filePath = path.join(TRANSCRIPTS_DIR, `ticket-${ticketId}-${Date.now()}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    return filePath;
}

async function saveTranscriptToLogs(interaction, channel, ticketId, mode = 'manual') {
    const transcriptPath = await createTranscript(channel, ticketId);
    const attachment = new AttachmentBuilder(transcriptPath);

    const logChannel = interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL_ID);

    let transcriptMessage = null;

    if (logChannel) {
        transcriptMessage = await logChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle(mode === 'close' ? `📁 Ticket Transcript #${ticketId}` : `📁 Manual Transcript #${ticketId}`)
                    .setDescription(
                        `${mode === 'close' ? 'تم إغلاق التذكرة وحفظ سجل HTML.' : 'تم إنشاء Transcript يدويًا.'}\n\n` +
                        `👤 بواسطة: ${interaction.user}\n` +
                        `📍 الروم: \`${channel.name}\``
                    )
                    .setTimestamp()
            ],
            files: [attachment]
        });
    }

    return {
        transcriptPath,
        transcriptMessage,
        logChannel
    };
}

async function sendRatingLog(interaction, ticketId, rating) {
    const logChannel = interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL_ID);

    if (!logChannel) return;

    await logChannel.send({
        embeds: [
            new EmbedBuilder()
                .setColor('#D4AF37')
                .setTitle(`⭐ Ticket Rating #${ticketId}`)
                .setDescription(
                    `تم تقييم التذكرة.\n\n` +
                    `👤 المقيم: ${interaction.user}\n` +
                    `⭐ التقييم: **${rating}/5**`
                )
                .setTimestamp()
        ]
    }).catch(() => {});
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        const customId = interaction.customId;

        if (!customId.startsWith('ticket_')) return;

        const channel = interaction.channel;
        const ticket = ticketDB.findTicketByChannel
            ? ticketDB.findTicketByChannel(channel.name, channel.id)
            : null;

        const ticketId = ticket?.id || channel.name.split('-').pop() || 'unknown';

        if (customId.startsWith('ticket_rate_')) {
            const parts = customId.split('_');

            if (parts[2] === 'disabled') {
                return interaction.reply({
                    content: '✅ تم تسجيل التقييم مسبقًا.',
                    flags: 64
                }).catch(() => {});
            }

            const rating = Number(parts[2]);
            const ratedTicketId = parts.slice(3).join('_') || ticketId;

            if (!rating || rating < 1 || rating > 5) {
                return interaction.reply({
                    content: '❌ تقييم غير صحيح.',
                    flags: 64
                }).catch(() => {});
            }

            const targetTicket = ticketDB.updateTicket
                ? ticketDB.updateTicket(ratedTicketId, {
                    rating,
                    ratingBy: interaction.user.tag,
                    ratingById: interaction.user.id,
                    ratingAt: new Date().toISOString()
                })
                : null;

            await sendRatingLog(interaction, ratedTicketId, rating);

            return interaction.update({
                embeds: [
                    createEmbed({
                        title: '⭐ شكرًا على تقييمك',
                        description:
                            `تم تسجيل تقييمك بنجاح.\n\n` +
                            `⭐ التقييم: **${rating}/5**\n\n` +
                            `سيتم حذف الروم قريبًا.`,
                        thumbnail: interaction.user.displayAvatarURL()
                    })
                ],
                components: [
                    disabledRatingRow(ratedTicketId, rating)
                ]
            }).catch(() => {});
        }

        if (!isStaff(interaction.member)) {
            return interaction.reply({
                content: '❌ هذا الزر مخصص لفريق التذاكر فقط.',
                flags: 64
            }).catch(() => {});
        }

        if (customId === 'ticket_claim') {
            if (ticketDB.updateTicket && ticket?.id) {
                ticketDB.updateTicket(ticket.id, {
                    claimedBy: interaction.user.tag,
                    claimedById: interaction.user.id,
                    claimedAt: new Date().toISOString(),
                    status: 'CLAIMED'
                });
            }

            await interaction.update({
                components: [ticketButtonsRow(true)]
            });

            return channel.send({
                embeds: [
                    createEmbed({
                        title: '🟢 تم استلام التذكرة',
                        description: `تم استلام هذه التذكرة بواسطة ${interaction.user}.`,
                        thumbnail: interaction.user.displayAvatarURL()
                    })
                ]
            });
        }

        if (customId === 'ticket_options') {
            return interaction.reply({
                embeds: [
                    createEmbed({
                        title: '⚙️ خيارات التذكرة',
                        description:
                            `اختر العملية التي تريد تنفيذها:\n\n` +
                            `👤 إضافة عضو للتذكرة\n` +
                            `🚫 إزالة عضو من التذكرة\n` +
                            `📁 حفظ HTML بدون إغلاق\n` +
                            `🔒 إغلاق التذكرة`,
                        thumbnail: client.user.displayAvatarURL()
                    })
                ],
                components: optionsRows(),
                flags: 64
            }).catch(() => {});
        }

        if (customId === 'ticket_add_member') {
            return interaction.showModal(
                memberModal('ticket_add_member_modal', 'إضافة عضو للتذكرة')
            ).catch(() => {});
        }

        if (customId === 'ticket_remove_member') {
            return interaction.showModal(
                memberModal('ticket_remove_member_modal', 'إزالة عضو من التذكرة')
            ).catch(() => {});
        }

        if (customId === 'ticket_add_member_modal') {
            const input = interaction.fields.getTextInputValue('member_id');
            const userId = extractUserId(input);

            if (!userId) {
                return interaction.reply({
                    content: '❌ لم أستطع قراءة ID العضو.',
                    flags: 64
                }).catch(() => {});
            }

            const member = await interaction.guild.members.fetch(userId).catch(() => null);

            if (!member) {
                return interaction.reply({
                    content: '❌ العضو غير موجود داخل السيرفر.',
                    flags: 64
                }).catch(() => {});
            }

            await channel.permissionOverwrites.edit(userId, {
                ViewChannel: true,
                ReadMessageHistory: true,
                SendMessages: true,
                AttachFiles: true,
                EmbedLinks: true
            });

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title: '👤 تم إضافة عضو',
                        description: `تم إضافة ${member} إلى التذكرة بواسطة ${interaction.user}.`,
                        thumbnail: member.user.displayAvatarURL()
                    })
                ]
            }).catch(() => {});
        }

        if (customId === 'ticket_remove_member_modal') {
            const input = interaction.fields.getTextInputValue('member_id');
            const userId = extractUserId(input);

            if (!userId) {
                return interaction.reply({
                    content: '❌ لم أستطع قراءة ID العضو.',
                    flags: 64
                }).catch(() => {});
            }

            const member = await interaction.guild.members.fetch(userId).catch(() => null);

            await channel.permissionOverwrites.delete(userId).catch(() => null);

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title: '🚫 تم إزالة عضو',
                        description: `تم إزالة <@${userId}> من التذكرة بواسطة ${interaction.user}.`,
                        thumbnail: member?.user?.displayAvatarURL?.() || client.user.displayAvatarURL()
                    })
                ]
            }).catch(() => {});
        }

        if (customId === 'ticket_save_html') {
            await interaction.deferReply({
                flags: 64
            }).catch(() => {});

            const saved = await saveTranscriptToLogs(interaction, channel, ticketId, 'manual');

            if (ticketDB.updateTicket && ticket?.id) {
                ticketDB.updateTicket(ticket.id, {
                    transcriptMessageId: saved.transcriptMessage?.id || null,
                    transcriptChannelId: saved.logChannel?.id || null,
                    lastTranscriptAt: new Date().toISOString()
                });
            }

            return interaction.editReply({
                content: '✅ تم حفظ ملف HTML داخل روم السجلات.'
            }).catch(() => {});
        }

        if (customId === 'ticket_close') {
            await interaction.deferReply({
                flags: 64
            }).catch(() => {});

            const saved = await saveTranscriptToLogs(interaction, channel, ticketId, 'close');

            if (ticketDB.updateTicket && ticket?.id) {
                ticketDB.updateTicket(ticket.id, {
                    status: 'CLOSING',
                    closedBy: interaction.user.tag,
                    closedById: interaction.user.id,
                    closedAt: new Date().toISOString(),
                    transcriptMessageId: saved.transcriptMessage?.id || null,
                    transcriptChannelId: saved.logChannel?.id || null
                });
            }

            await interaction.editReply({
                content: '✅ تم حفظ HTML. سيتم إغلاق التذكرة خلال 30 ثانية.'
            }).catch(() => {});

            await channel.send({
                embeds: [
                    createEmbed({
                        title: '⭐ تقييم التذكرة',
                        description:
                            `قبل إغلاق التذكرة، يرجى تقييم الخدمة من 1 إلى 5.\n\n` +
                            `سيتم حذف الروم خلال **30 ثانية**.`,
                        thumbnail: client.user.displayAvatarURL()
                    })
                ],
                components: [
                    ratingRow(ticketId)
                ]
            }).catch(() => {});

            return setTimeout(() => {
                if (ticketDB.updateTicket && ticket?.id) {
                    ticketDB.updateTicket(ticket.id, {
                        status: 'CLOSED'
                    });
                }

                channel.delete().catch(() => {});
            }, 30000);
        }
    }
};