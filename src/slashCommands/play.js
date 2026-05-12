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
        await interaction.deferReply();

        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        const song = interaction.options.getString('song');

        if (!voiceChannel) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Music System',
                        description: 'يجب أن تدخل روم صوتي أولًا.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        if (!client.distube) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Music System',
                        description: 'نظام الموسيقى غير مفعّل داخل البوت بعد.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        try {
            await client.distube.play(voiceChannel, song, {
                textChannel: interaction.channel,
                member
            });

            logger.info(`${interaction.user.tag} used /play | Song: ${song}`);

            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '🎶 NEXUS Music System',
                        description: 'تم إرسال طلب التشغيل بنجاح.',
                        fields: [
                            {
                                name: '🎵 الأغنية',
                                value: `\`${song}\``,
                                inline: false
                            },
                            {
                                name: '👤 بواسطة',
                                value: `${interaction.user}`,
                                inline: true
                            },
                            {
                                name: '🔊 الروم الصوتي',
                                value: `${voiceChannel}`,
                                inline: true
                            }
                        ],
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });

        } catch (error) {
            logger.error(`Play command error: ${error.stack || error}`);

            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '❌ NEXUS Music System',
                        description: 'فشل تشغيل الأغنية. تأكد من الرابط أو اسم الأغنية.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }
    }
};