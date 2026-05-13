const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('تشغيل موسيقى')
        .addStringOption(option =>
            option
                .setName('song')
                .setDescription('اسم أو رابط الأغنية')
                .setRequired(true)
        ),

    async execute(interaction, client) {

        const query = interaction.options.getString('song');

        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setDescription('❌ يجب عليك دخول روم صوتي أولاً')
                ],
                ephemeral: true
            });
        }

        const permissions = voiceChannel.permissionsFor(
            interaction.guild.members.me
        );

        if (
            !permissions.has('Connect') ||
            !permissions.has('Speak')
        ) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setDescription(
                            '❌ لا أملك صلاحيات الدخول أو التحدث بالروم الصوتي'
                        )
                ],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {

            const player = client.manager.create({
                guild: interaction.guild.id,
                voiceChannel: voiceChannel.id,
                textChannel: interaction.channel.id,
                selfDeafen: true,
                volume: 80
            });

            if (player.state !== 'CONNECTED') {
                player.connect();
            }

            const res = await client.manager.search(
                query,
                interaction.user
            );

            if (
                !res ||
                !res.tracks.length
            ) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setDescription(
                                '❌ لم يتم العثور على أي نتائج'
                            )
                    ]
                });
            }

            const track = res.tracks[0];

            track.requester = interaction.user;

            player.queue.add(track);

            if (!player.playing && !player.paused) {
                player.play();
            }

            const embed = new EmbedBuilder()
                .setColor('#D4AF37')
                .setTitle('🎵 تمت إضافة أغنية')
                .setDescription(`\`${track.title}\``)
                .addFields(
                    {
                        name: '⏱ المدة',
                        value: track.duration,
                        inline: true
                    },
                    {
                        name: '👤 الطلب بواسطة',
                        value: `${interaction.user}`,
                        inline: true
                    }
                )
                .setFooter({
                    text: 'NEXUS COMMUNITY • Lavalink Music System'
                });

            interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {

            console.error('PLAY ERROR:', error);

            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('❌ NEXUS Music System')
                        .setDescription(
                            'حدث خطأ أثناء تشغيل الموسيقى'
                        )
                ]
            });
        }
    }
};