const { SlashCommandBuilder } = require('discord.js');

const createEmbed = require('../utils/embed');
const logger = require('../utils/logger');

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
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Music System',
                        description: 'يجب أن تدخل روم صوتي أولًا.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ],
                flags: 64
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
                    createEmbed({
                        title: '❌ NEXUS Music System',
                        description: 'لا أملك صلاحية الدخول أو التحدث داخل الروم الصوتي.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ],
                flags: 64
            });
        }

        await interaction.deferReply();

        try {

            await client.distube.play(
                voiceChannel,
                song,
                {
                    member,
                    textChannel: interaction.channel,
                    interaction
                }
            );

            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '🎶 NEXUS Music System',
                        description: `جاري تشغيل:\n\`${song}\``,
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });

        } catch (error) {

            console.error('PLAY ERROR FULL:', error);

            logger.error(
                `Play command error: ${error.stack || error}`
            );

            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Music System',
                        description:
                            `فشل تشغيل الأغنية.\n\n` +
                            '```' +
                            `${String(error.message || error).slice(0, 1000)}` +
                            '```',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }
    }
};