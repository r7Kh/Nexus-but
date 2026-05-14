const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const mafiaSessions = require('../utils/mafiaSessions');
const gameSessions = require('../utils/gameSessions');
const gameDB = require('../utils/gameDB');

const GAME_CHANNEL_ID = '1429135776289132544';
const MIN_PLAYERS = 4;

function mafiaButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mafia_join').setLabel('دخول اللعبة').setEmoji('✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('mafia_leave').setLabel('خروج').setEmoji('🚪').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('mafia_start').setLabel('بدء اللعبة').setEmoji('▶️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('mafia_cancel').setLabel('إلغاء').setEmoji('❌').setStyle(ButtonStyle.Danger)
        )
    ];
}

function lobbyEmbed(lobby, client) {
    const playersText = lobby.players.length
        ? lobby.players.map((player, index) => `**${index + 1}.** <@${player.id}>`).join('\n')
        : 'لا يوجد لاعبين بعد.';

    return new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle('🕵️ NEXUS Mafia Lobby')
        .setDescription(
            `تم فتح لوبي مافيا جديد.\n\n` +
            `👑 الهوست: <@${lobby.hostId}>\n` +
            `👥 اللاعبين: \`${lobby.players.length}\`\n` +
            `📌 الحد الأدنى: \`${MIN_PLAYERS}\` لاعبين\n\n` +
            `**قائمة اللاعبين:**\n${playersText}\n\n` +
            `اضغط دخول للمشاركة، وبعد اكتمال العدد الهوست يضغط بدء اللعبة.`
        )
        .setImage('https://images.unsplash.com/photo-1518709268805-4e9042af2176')
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: 'NEXUS COMMUNITY • Mafia System' })
        .setTimestamp();
}

function assignRoles(players) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);

    const roles = [];

    roles.push({
        ...shuffled[0],
        role: 'Mafia',
        emoji: '🔪',
        description: 'أنت المافيا. حاول تخفي هويتك وتضل للآخر.'
    });

    roles.push({
        ...shuffled[1],
        role: 'Doctor',
        emoji: '💉',
        description: 'أنت الدكتور. مهمتك حماية اللاعبين.'
    });

    roles.push({
        ...shuffled[2],
        role: 'Detective',
        emoji: '🕵️',
        description: 'أنت المحقق. حاول تعرف مين المافيا.'
    });

    for (let i = 3; i < shuffled.length; i++) {
        roles.push({
            ...shuffled[i],
            role: 'Citizen',
            emoji: '👤',
            description: 'أنت مواطن. حاول تكتشف المافيا مع الباقي.'
        });
    }

    return roles;
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('mafia_')) return;

        if (interaction.channel.id !== GAME_CHANNEL_ID) {
            return interaction.reply({
                content: `❌ لعبة المافيا تشتغل فقط داخل <#${GAME_CHANNEL_ID}>`,
                flags: 64
            });
        }

        if (interaction.customId === 'mafia_create') {
            const activeSession = gameSessions.getUserSession(interaction.user.id);
            const activeLobby = mafiaSessions.getLobby(interaction.channel.id);

            if (activeSession && activeSession.type !== 'hub') {
                return interaction.reply({
                    content: '⏳ عندك لعبة شغالة بالفعل. أغلقها أولًا قبل فتح Mafia.',
                    flags: 64
                });
            }

            if (activeSession && activeSession.type === 'hub') {
                gameSessions.clearUserSession(interaction.user.id);
            }

            if (activeLobby) {
                return interaction.reply({
                    content: '❌ يوجد لوبي Mafia مفتوح بالفعل في هذا الروم.',
                    flags: 64
                });
            }

            const lobby = mafiaSessions.createLobby(
                interaction.channel.id,
                interaction.user
            );

            gameSessions.createSession({
                userId: interaction.user.id,
                channelId: interaction.channel.id,
                type: 'mafia'
            });

            const reply = await interaction.reply({
                content: '@here 🕵️ تم فتح لوبي Mafia جديد!',
                embeds: [lobbyEmbed(lobby, client)],
                components: mafiaButtons(),
                fetchReply: true
            });

            gameSessions.attachMessage(interaction.user.id, reply.id);
            return;
        }

        const lobby = mafiaSessions.getLobby(interaction.channel.id);

        if (!lobby) {
            return interaction.reply({
                content: '❌ لا يوجد لوبي Mafia مفتوح حاليًا.',
                flags: 64
            });
        }

        if (interaction.customId === 'mafia_join') {
            const updatedLobby = mafiaSessions.addPlayer(
                interaction.channel.id,
                interaction.user
            );

            return interaction.update({
                embeds: [lobbyEmbed(updatedLobby, client)],
                components: mafiaButtons()
            });
        }

        if (interaction.customId === 'mafia_leave') {
            if (interaction.user.id === lobby.hostId) {
                return interaction.reply({
                    content: '❌ الهوست لا يستطيع الخروج. يمكنك إلغاء اللوبي بدلًا من ذلك.',
                    flags: 64
                });
            }

            const updatedLobby = mafiaSessions.removePlayer(
                interaction.channel.id,
                interaction.user.id
            );

            return interaction.update({
                embeds: [lobbyEmbed(updatedLobby, client)],
                components: mafiaButtons()
            });
        }

        if (interaction.customId === 'mafia_cancel') {
            if (interaction.user.id !== lobby.hostId) {
                return interaction.reply({
                    content: '❌ فقط الهوست يستطيع إلغاء اللوبي.',
                    flags: 64
                });
            }

            mafiaSessions.deleteLobby(interaction.channel.id);
            gameSessions.clearUserSession(interaction.user.id);

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF3B3B')
                        .setTitle('❌ NEXUS Mafia Cancelled')
                        .setDescription(`تم إلغاء لوبي المافيا بواسطة ${interaction.user}.`)
                        .setFooter({ text: 'NEXUS COMMUNITY • Mafia System' })
                        .setTimestamp()
                ],
                components: []
            });
        }

        if (interaction.customId === 'mafia_start') {
            if (interaction.user.id !== lobby.hostId) {
                return interaction.reply({
                    content: '❌ فقط الهوست يستطيع بدء اللعبة.',
                    flags: 64
                });
            }

            if (lobby.players.length < MIN_PLAYERS) {
                return interaction.reply({
                    content: `❌ لا يمكن بدء المافيا. الحد الأدنى هو ${MIN_PLAYERS} لاعبين.`,
                    flags: 64
                });
            }

            lobby.status = 'STARTED';

            const roles = assignRoles(lobby.players);

            for (const player of roles) {
                const member = await interaction.guild.members.fetch(player.id).catch(() => null);

                if (member) {
                    await member.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#D4AF37')
                                .setTitle(`${player.emoji} دورك في Mafia`)
                                .setDescription(
                                    `🎭 الدور: **${player.role}**\n\n` +
                                    `${player.description}\n\n` +
                                    `🤫 لا تخبر أحدًا بدورك.`
                                )
                                .setFooter({ text: 'NEXUS COMMUNITY • Secret Role' })
                                .setTimestamp()
                        ]
                    }).catch(() => {});
                }
            }

            mafiaSessions.deleteLobby(interaction.channel.id);
            gameSessions.clearUserSession(interaction.user.id);

            for (const player of lobby.players) {
                gameDB.addReward(
                    { id: player.id, tag: player.tag },
                    {
                        coins: 20,
                        xp: 15,
                        win: false,
                        loss: false
                    }
                );
            }

            return interaction.update({
                content: lobby.players.map(player => `<@${player.id}>`).join(' '),
                embeds: [
                    new EmbedBuilder()
                        .setColor('#D4AF37')
                        .setTitle('🕵️ NEXUS Mafia Started')
                        .setDescription(
                            `بدأت لعبة المافيا!\n\n` +
                            `👥 عدد اللاعبين: \`${lobby.players.length}\`\n` +
                            `📩 تم إرسال الأدوار بالخاص لكل لاعب.\n\n` +
                            `🌙 **مرحلة الليل بدأت الآن.**\n` +
                            `اتفقوا داخل الروم حسب قوانينكم وابدأوا الجولة.`
                        )
                        .setImage('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee')
                        .setFooter({ text: 'NEXUS COMMUNITY • Mafia Started' })
                        .setTimestamp()
                ],
                components: []
            });
        }
    }
};