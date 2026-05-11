const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو المراد حظره')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب الحظر')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'بدون سبب';

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member) {
            return interaction.editReply({
                content: '❌ العضو غير موجود داخل السيرفر'
            });
        }

        if (!member.bannable) {
            return interaction.editReply({
                content: '❌ لا أستطيع حظر هذا العضو (صلاحيات أو ترتيب الرتب)'
            });
        }

        try {
            await member.ban({ reason });

            logger.addLog(
                'BAN',
                interaction.user.tag,
                user.tag,
                reason
            );

            return interaction.editReply({
                content: `🔨 تم حظر ${user.tag}\n📌 السبب: ${reason}`
            });

        } catch (error) {
            console.error(error);

            return interaction.editReply({
                content: '❌ حدث خطأ أثناء تنفيذ الحظر'
            });
        }
    }
};