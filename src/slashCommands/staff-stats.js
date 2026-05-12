const { SlashCommandBuilder } = require('discord.js');

const createEmbed = require('../utils/embed');
const staffStatsDB = require('../utils/staffStatsDB');
const ticketDB = require('../utils/ticketDB');

const CM_ROLE_ID = '1429197885139980348';

function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60000);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
}

function getRatingStatsByStaff() {
    const data = ticketDB.readData();
    const ratings = {};

    for (const ticket of data.tickets) {
        if (!ticket.claimedById) continue;
        if (!ticket.rating) continue;

        if (!ratings[ticket.claimedById]) {
            ratings[ticket.claimedById] = {
                totalRating: 0,
                ratingCount: 0
            };
        }

        ratings[ticket.claimedById].totalRating += Number(ticket.rating);
        ratings[ticket.claimedById].ratingCount += 1;
    }

    return ratings;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff-stats')
        .setDescription('عرض إحصائيات الإدارة الأسبوعية'),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });

        if (!interaction.member.roles.cache.has(CM_ROLE_ID)) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '🚫 NEXUS Permission System',
                        description: 'هذا الأمر متاح فقط لرتبة CM.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        const stats = staffStatsDB.getCurrentWeekStats();
        const ratingStats = getRatingStatsByStaff();

        if (!stats.length) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '📊 NEXUS Staff Weekly Stats',
                        description: 'لا توجد إحصائيات لهذا الأسبوع حتى الآن.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        const sortedStats = stats.sort((a, b) => {
            const ratingA = ratingStats[a.userId]
                ? ratingStats[a.userId].totalRating / ratingStats[a.userId].ratingCount
                : 0;

            const ratingB = ratingStats[b.userId]
                ? ratingStats[b.userId].totalRating / ratingStats[b.userId].ratingCount
                : 0;

            const scoreA =
                a.messages +
                (a.ticketsClaimed * 10) +
                Math.floor(a.voiceMs / 60000) +
                Math.floor(ratingA * 10);

            const scoreB =
                b.messages +
                (b.ticketsClaimed * 10) +
                Math.floor(b.voiceMs / 60000) +
                Math.floor(ratingB * 10);

            return scoreB - scoreA;
        });

        const description = sortedStats
            .map((staff, index) => {
                const ratingData = ratingStats[staff.userId];

                const averageRating = ratingData
                    ? (ratingData.totalRating / ratingData.ratingCount).toFixed(1)
                    : '0.0';

                const ratingCount = ratingData
                    ? ratingData.ratingCount
                    : 0;

                return (
                    `**#${index + 1}** <@${staff.userId}>\n` +
                    `💬 الرسائل: \`${staff.messages}\`\n` +
                    `🎫 التكتات المستلمة: \`${staff.ticketsClaimed}\`\n` +
                    `⭐ متوسط التقييم: \`${averageRating}/5\` (${ratingCount} تقييم)\n` +
                    `🔊 الفويس: \`${formatDuration(staff.voiceMs)}\``
                );
            })
            .join('\n\n');

        return interaction.editReply({
            embeds: [
                createEmbed({
                    title: '📊 NEXUS Staff Weekly Stats',
                    description,
                    thumbnail: client.user.displayAvatarURL()
                })
            ]
        });
    }
};