const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('تشغيل أغنية')
        .addStringOption(option =>
            option
                .setName('song')
                .setDescription('اسم الأغنية أو رابط YouTube')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        const song = interaction.options.getString('song');

        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ يجب أن تدخل روم صوتي أولًا',
                flags: 64
            });
        }

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        try {
            await client.distube.play(voiceChannel, song, {
                textChannel: interaction.channel,
                member
            });

            return interaction.editReply({
                content: `🎶 جاري تشغيل: **${song}**`
            });

        } catch (error) {
            console.error(error);

            if (interaction.deferred || interaction.replied) {
                return interaction.editReply({
                    content: '❌ فشل تشغيل الأغنية'
                });
            }

            return interaction.reply({
                content: '❌ فشل تشغيل الأغنية',
                flags: 64
            });
        }
    }
};