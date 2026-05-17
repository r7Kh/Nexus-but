const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const ALLOWED_ROLE_IDS = [
    '1429197885139980348', // Cm
    '1436501239599992985', // LeadAdmin
    '1436484272101003386', // Responsible
    '1429135690808954950', // Administrator
    '1429135693434851591'  // Moderator
];

function hasPermission(member) {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    return ALLOWED_ROLE_IDS.some(roleId =>
        member.roles.cache.has(roleId)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-status')
        .setDescription('تغيير حالة روم صوتي')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('الروم الصوتي')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('النص الذي سيظهر')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!hasPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.',
                flags: 64
            });
        }

        const channel = interaction.options.getChannel('channel');
        const text = interaction.options.getString('text');

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return interaction.reply({
                content: '❌ يجب اختيار روم صوتي.',
                flags: 64
            });
        }

        try {
            await interaction.client.rest.put(
                `/channels/${channel.id}/voice-status`,
                {
                    body: {
                        status: text
                    }
                }
            );

            return interaction.reply({
                content:
                    `✅ تم تغيير حالة الروم الصوتي.\n\n` +
                    `🎤 الروم: ${channel}\n` +
                    `📝 الحالة الجديدة:\n\`${text}\``,
                flags: 64
            });

        } catch (error) {
            console.log(error);

            return interaction.reply({
                content:
                    '❌ فشل تغيير الحالة.\n\n' +
                    'تأكد أن البوت لديه:\n' +
                    '`SET_VOICE_CHANNEL_STATUS`\n' +
                    '`MANAGE_CHANNELS`',
                flags: 64
            });
        }
    }
};