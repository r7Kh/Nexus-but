const { SlashCommandBuilder } = require('discord.js');

const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');
const sendModLog = require('../utils/modLogger');
const { hasAdminPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bans')
        .setDescription('عرض قائمة الأعضاء المحظورين'),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });

        if (!hasAdminPermission(interaction.member)) {
            return interaction.editReply({
                embeds: [createEmbed({
                    title: '🚫 NEXUS Permission System',
                    description: 'ليس لديك صلاحية لاستخدام هذا الأمر.',
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }

        try {
            const bans = await interaction.guild.bans.fetch();

            if (!bans.size) {
                return interaction.editReply({
                    embeds: [createEmbed({
                        title: '📋 NEXUS Ban List',
                        description: 'لا يوجد أي أعضاء محظورين حاليًا.',
                        thumbnail: client.user.displayAvatarURL()
                    })]
                });
            }

            const banList = bans
                .map((ban, index) =>
                    `**${index + 1}.** <@${ban.user.id}>\n🆔 \`${ban.user.id}\`\n📌 ${ban.reason || 'بدون سبب'}`
                )
                .slice(0, 10)
                .join('\n\n');

            await interaction.editReply({
                embeds: [createEmbed({
                    title: '📋 NEXUS Ban List',
                    description: banList,
                    fields: [
                        { name: '📊 العدد الكامل', value: `\`${bans.size}\``, inline: true },
                        { name: 'ℹ️ ملاحظة', value: '`يتم عرض أول 10 فقط`', inline: true }
                    ],
                    thumbnail: client.user.displayAvatarURL()
                })]
            });

            await sendModLog(client, {
                title: '📋 Ban List Checked',
                description: 'تم عرض قائمة المحظورين داخل السيرفر.',
                thumbnail: interaction.user.displayAvatarURL(),
                fields: [
                    { name: '🛡️ الإداري', value: `${interaction.user}`, inline: true },
                    { name: '📊 عدد المحظورين', value: `\`${bans.size}\``, inline: true }
                ]
            });

            logger.info(`${interaction.user.tag} checked ban list`);

        } catch (error) {
            logger.error(`Bans command error: ${error.stack || error}`);

            return interaction.editReply({
                embeds: [createEmbed({
                    title: '❌ NEXUS Ban List',
                    description: 'حدث خطأ أثناء جلب قائمة المحظورين.',
                    thumbnail: client.user.displayAvatarURL()
                })]
            });
        }
    }
};