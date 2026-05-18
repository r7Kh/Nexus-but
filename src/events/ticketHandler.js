const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    PermissionFlagsBits
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

function escapeHtml(text = '') {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
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

        return `
        <div class="message">
            <img class="avatar" src="${msg.author.displayAvatarURL()}" />
            <div class="content">
                <div class="meta">
                    <span class="author">${escapeHtml(msg.author.tag)}</span>
                    <span class="time">${new Date(msg.createdTimestamp).toLocaleString()}</span>
                </div>
                <div class="text">${escapeHtml(msg.content || '').replaceAll('\n', '<br>')}</div>
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

    const filePath = path.join(TRANSCRIPTS_DIR, `ticket-${ticketId}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    return filePath;
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;

        if (!customId.startsWith('ticket_')) return;

        if (!isStaff(interaction.member) && customId !== 'ticket_close') {
            return interaction.reply({
                content: '❌ هذا الزر مخصص لفريق التذاكر فقط.',
                flags: 64
            });
        }

        const channel = interaction.channel;
       const ticket = ticketDB.findTicketByChannel
    ? ticketDB.findTicketByChannel(channel.name, channel.id)
    : null;

        const ticketId = ticket?.id || channel.name.split('-').pop() || 'unknown';

        if (customId === 'ticket_claim') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({
                    content: '❌ فقط فريق التذاكر يستطيع استلام التذكرة.',
                    flags: 64
                });
            }

            if (ticketDB.updateTicket && ticket?.id) {
                ticketDB.updateTicket(ticket.id, {
                    claimedBy: interaction.user.id,
                    claimedByTag: interaction.user.tag,
                    status: 'claimed'
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
                content:
                    `⚙️ خيارات التذكرة:\n\n` +
                    `• استلام التذكرة\n` +
                    `• إغلاق التذكرة مع حفظ HTML Transcript\n` +
                    `• قريبًا: إضافة عضو / إزالة عضو`,
                flags: 64
            });
        }

        if (customId === 'ticket_close') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({
                    content: '❌ فقط فريق التذاكر يستطيع إغلاق التذكرة.',
                    flags: 64
                });
            }

            await interaction.reply({
                content: '⏳ يتم إنشاء ملف HTML للتذكرة...',
                flags: 64
            });

            const transcriptPath = await createTranscript(channel, ticketId);
            const attachment = new AttachmentBuilder(transcriptPath);

            const logChannel = interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL_ID);

            let transcriptMessage = null;

            if (logChannel) {
                transcriptMessage = await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#D4AF37')
                            .setTitle(`📁 Ticket Transcript #${ticketId}`)
                            .setDescription(
                                `تم إغلاق التذكرة وحفظ سجل HTML.\n\n` +
                                `🔒 أغلقها: ${interaction.user}\n` +
                                `📍 الروم: \`${channel.name}\``
                            )
                            .setTimestamp()
                    ],
                    files: [attachment]
                });
            }

            if (ticketDB.updateTicket && ticket?.id) {
                ticketDB.updateTicket(ticket.id, {
                    status: 'closed',
                    closedBy: interaction.user.id,
                    closedByTag: interaction.user.tag,
                    closedAt: new Date().toISOString(),
                    transcriptMessageId: transcriptMessage?.id || null,
                    transcriptChannelId: logChannel?.id || null
                });
            }

            await channel.send({
                embeds: [
                    createEmbed({
                        title: '🔒 سيتم إغلاق التذكرة',
                        description: 'تم حفظ سجل التذكرة كملف HTML. سيتم حذف الروم خلال 5 ثواني.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });

            setTimeout(() => {
                channel.delete().catch(() => {});
            }, 5000);
        }
    }
};