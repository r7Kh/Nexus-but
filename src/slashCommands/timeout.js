const { SlashCommandBuilder } = require('discord.js');

const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');
const sendModLog = require('../utils/modLogger');
const { hasModerationPermission } = require('../utils/permissions');

function parseDuration(duration) {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;

    const value = Number(match[1]);
    const unit = match[2];

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('إعطاء Timeout لعضو')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('المدة مثال: 10m / 1h / 1d')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب التايم أوت')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });

        if (!hasModerationPermission(interaction.member)) {
            return interaction.editReply({
                embeds: [createEmbed({
                    title: '🚫 NEXUS Permission System',
                    description: 'ليس لديك صلاحية لاستخدام هذا الأمر.',
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }

        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'بدون سبب';
        const durationMs = parseDuration(duration);

        if (!durationMs) {
            return interaction.editReply({
                embeds: [createEmbed({
                    title: '⚠️ NEXUS Timeout System',
                    description: 'صيغة المدة غير صحيحة.',
                    fields: [{ name: '✅ أمثلة صحيحة', value: '`10m` `1h` `1d`', inline: false }],
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }

        if (durationMs > 28 * 24 * 60 * 60 * 1000) {
            return interaction.editReply({
                embeds: [createEmbed({
                    title: '⚠️ NEXUS Timeout System',
                    description: 'أقصى مدة للـ Timeout هي 28 يوم.',
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.editReply({
                embeds: [createEmbed({
                    title: '❌ NEXUS Timeout System',
                    description: 'العضو غير موجود داخل السيرفر.',
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }

        if (!member.moderatable) {
            return interaction.editReply({
                embeds: [createEmbed({
                    title: '⚠️ NEXUS Timeout System',
                    description: 'لا أستطيع إعطاء Timeout لهذا العضو بسبب الصلاحيات أو ترتيب الرتب.',
                    fields: [{ name: '👤 العضو', value: `${user}`, inline: true }],
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }

        try {
            await member.timeout(durationMs, reason);

            await sendModLog(client, {
                title: '⏳ Member Timed Out',
                description: 'تم إعطاء Timeout لعضو داخل السيرفر.',
                thumbnail: user.displayAvatarURL(),
                fields: [
                    { name: '👤 العضو', value: `${user}`, inline: true },
                    { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                    { name: '⏱️ المدة', value: `\`${duration}\``, inline: true },
                    { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
                    { name: '📌 السبب', value: reason, inline: false }
                ]
            });

            logger.info(`${interaction.user.tag} timed out ${user.tag} for ${duration} | Reason: ${reason}`);

            return interaction.editReply({
                embeds: [createEmbed({
                    title: '⏳ NEXUS Timeout System',
                    description: 'تم إعطاء Timeout للعضو بنجاح.',
                    fields: [
                        { name: '👤 العضو', value: `${user}`, inline: true },
                        { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                        { name: '⏱️ المدة', value: `\`${duration}\``, inline: true },
                        { name: '📌 السبب', value: reason, inline: false }
                    ],
                    thumbnail: user.displayAvatarURL()
                })]
            });

        } catch (error) {
            logger.error(`Timeout command error: ${error.stack || error}`);

            return interaction.editReply({
                embeds: [createEmbed({
                    title: '❌ NEXUS Timeout System',
                    description: 'حدث خطأ أثناء تنفيذ Timeout.',
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }
    }
};