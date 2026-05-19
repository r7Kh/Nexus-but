const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const CityPlayer = require('../models/CityPlayer');

const DUTY_ROLE_ID = '1506215288297754715';
const OFF_DUTY_ROLE_ID = '1506215568317874206';

const FACTIONS_ALLOWED_DUTY = [
    'Police',
    'Gang',
    'Medical',
    'Fire Department',
    'Cyber Security'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('city-duty')
        .setDescription('تسجيل دخول أو خروج من الخدمة داخل NEXUS CITY'),

    async execute(interaction) {
        const player = await CityPlayer.findOne({
            userId: interaction.user.id
        });

        if (!player) {
            return interaction.reply({
                content: '❌ لا تملك شخصية داخل NEXUS CITY.',
                flags: 64
            });
        }

        if (!FACTIONS_ALLOWED_DUTY.includes(player.faction)) {
            return interaction.reply({
                content: '❌ يجب أن تكون داخل فصيل حتى تستخدم نظام الخدمة.',
                flags: 64
            });
        }

        player.inDuty = !player.inDuty;
        await player.save();

        const dutyRole = interaction.guild.roles.cache.get(DUTY_ROLE_ID);
        const offDutyRole = interaction.guild.roles.cache.get(OFF_DUTY_ROLE_ID);

        if (player.inDuty) {
            if (offDutyRole) {
                await interaction.member.roles.remove(offDutyRole).catch(() => {});
            }

            if (dutyRole) {
                await interaction.member.roles.add(dutyRole).catch(() => {});
            }
        } else {
            if (dutyRole) {
                await interaction.member.roles.remove(dutyRole).catch(() => {});
            }

            if (offDutyRole) {
                await interaction.member.roles.add(offDutyRole).catch(() => {});
            }
        }

        const embed = new EmbedBuilder()
            .setColor(player.inDuty ? '#00FF88' : '#FF3333')
            .setTitle(player.inDuty ? '🟢 تسجيل دخول خدمة' : '🔴 تسجيل خروج خدمة')
            .setDescription(
                `${interaction.user}\n\n` +
                `🏛️ الفصيل: **${player.faction}**\n` +
                `🎖️ الرتبة: **${player.factionRank}**\n` +
                `📌 الحالة الحالية: **${player.inDuty ? 'داخل الخدمة' : 'خارج الخدمة'}**\n\n` +
                `${player.inDuty
                    ? '✅ يمكنك الآن استخدام تفاعلات الفصيل والدخول في الفعاليات.'
                    : '⚠️ لن تستطيع استخدام تفاعلات الفصيل أو دخول الفعاليات حتى تعود للخدمة.'}`
            )
            .setFooter({ text: 'NEXUS CITY • Duty System' })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            flags: 64
        });
    }
};