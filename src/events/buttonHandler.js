const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const ticketDB = require('../utils/ticketDB');

const LOG_CHANNEL_ID = '1501336819151933510';

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;

        // 📖 عرض التذكرة من سجل التذاكر
        if (interaction.customId.startsWith('view_ticket_')) {
            const ticketId = interaction.customId.replace('view_ticket_', '');

            const data = ticketDB.readData();
            const ticket = data.tickets.find(t => t.id === ticketId);

            if (!ticket) {
                return interaction.reply({
                    content: '❌ لم يتم العثور على التذكرة',
                    flags: 64
                });
            }

            const transcriptText = ticket.transcript && ticket.transcript.length
                ? ticket.transcript
                    .map(msg => `**${msg.author}:** ${msg.content}`)
                    .join('\n')
                : 'لا توجد رسائل محفوظة';

            const finalText =
                transcriptText.length > 1800
                    ? transcriptText.slice(0, 1800) + '\n\n...تم اختصار السجل'
                    : transcriptText;

            return interaction.reply({
                content: `📖 **سجل التذكرة #${ticket.id}**\n\n${finalText}`,
                flags: 64
            });
        }

        // ⭐ تقييم التذكرة
        if (interaction.customId.startsWith('ticket_rate_')) {
            const parts = interaction.customId.split('_');
            const rating = parts[2];
            const ticketId = parts[3];

            const data = ticketDB.readData();
            const ticket = data.tickets.find(t => t.id === ticketId);

            if (!ticket) {
                return interaction.reply({
                    content: '❌ لم يتم العثور على التذكرة',
                    flags: 64
                });
            }

            if (interaction.user.id !== ticket.userId) {
                return interaction.reply({
                    content: '❌ فقط صاحب التذكرة يستطيع التقييم',
                    flags: 64
                });
            }

            if (ticket.rating) {
                return interaction.reply({
                    content: '❌ تم تقييم هذه التذكرة مسبقًا',
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
                const logMessage = await logChannel.messages
                    .fetch(updatedTicket.logMessageId)
                    .catch(() => null);

                if (logMessage) {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`view_ticket_${updatedTicket.id}`)
                            .setLabel('عرض التذكرة')
                            .setEmoji('📖')
                            .setStyle(ButtonStyle.Primary)
                    );

                    await logMessage.edit({
                        content: `
📁 **أرشيف تذكرة**

🎫 رقم التذكرة: #${updatedTicket.id}
👤 صاحب التذكرة: <@${updatedTicket.userId}>
📂 النوع: ${updatedTicket.type}

🟢 المستلم: ${updatedTicket.claimedById ? `<@${updatedTicket.claimedById}>` : 'لم يتم الاستلام'}
🔒 المغلق: ${updatedTicket.closedById ? `<@${updatedTicket.closedById}>` : 'غير معروف'}

⭐ التقييم: ${'⭐'.repeat(Number(rating))} (${rating}/5)
📝 تم التقييم بواسطة: <@${interaction.user.id}>

📅 الإنشاء: ${updatedTicket.createdAt}
📅 الإغلاق: ${updatedTicket.closedAt}
                        `,
                        components: [row]
                    });
                }
            }

            return interaction.update({
                content: `✅ شكرًا لك، تم تسجيل تقييمك: ${'⭐'.repeat(Number(rating))} (${rating}/5)`,
                components: []
            });
        }

        const ticket = ticketDB.findTicketByChannel(interaction.channel.name);

        if (!ticket) {
            return interaction.reply({
                content: '❌ لم يتم العثور على بيانات التذكرة',
                flags: 64
            });
        }

        // 🟢 استلام التذكرة
        if (interaction.customId === 'ticket_claim') {
            if (ticket.claimedBy) {
                return interaction.reply({
                    content: `❌ التذكرة مستلمة بالفعل بواسطة <@${ticket.claimedById}>`,
                    flags: 64
                });
            }

            ticketDB.updateTicket(ticket.id, {
                claimedBy: interaction.user.tag,
                claimedById: interaction.user.id,
                claimedAt: new Date().toLocaleString()
            });

            return interaction.reply({
                content: `🟢 تم استلام التذكرة بواسطة ${interaction.user}`
            });
        }

        // 🔒 إغلاق التذكرة
        if (interaction.customId === 'ticket_close') {
            await interaction.deferReply();

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
                    content: `
📁 **أرشيف تذكرة**

🎫 رقم التذكرة: #${updatedTicket.id}
👤 صاحب التذكرة: <@${updatedTicket.userId}>
📂 النوع: ${updatedTicket.type}

🟢 المستلم: ${updatedTicket.claimedById ? `<@${updatedTicket.claimedById}>` : 'لم يتم الاستلام'}
🔒 المغلق: <@${interaction.user.id}>

⭐ التقييم: لم يتم التقييم بعد

📅 الإنشاء: ${updatedTicket.createdAt}
📅 الإغلاق: ${updatedTicket.closedAt}
                    `,
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
                content: `<@${updatedTicket.userId}>\n⭐ الرجاء تقييم تعامل الإداري مع التذكرة:`,
                components: [ratingRow]
            });

            await interaction.editReply({
                content: '🔒 تم إغلاق التذكرة. سيتم حذف الروم بعد 30 ثانية.'
            });

            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 30000);
        }
    }
};