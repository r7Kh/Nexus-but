const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');

const mafiaSessions = require('../utils/mafiaSessions');
const gameSessions = require('../utils/gameSessions');
const gameDB = require('../utils/gameDB');

const GAME_CHANNEL_ID = '1429135776289132544';
const MIN_PLAYERS = 4;
const PHASE_TIME = 60_000;

function btn(id, label, emoji, style = ButtonStyle.Primary) {
    const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
    if (emoji) b.setEmoji(emoji);
    return b;
}

function row(components) {
    return new ActionRowBuilder().addComponents(components);
}

function lobbyButtons() {
    return [
        row([
            btn('mafia_join', 'دخول اللعبة', '✅', ButtonStyle.Success),
            btn('mafia_leave', 'خروج', '🚪', ButtonStyle.Secondary),
            btn('mafia_start', 'بدء اللعبة', '▶️', ButtonStyle.Primary),
            btn('mafia_cancel', 'إلغاء', '❌', ButtonStyle.Danger)
        ])
    ];
}

function lobbyEmbed(lobby, client) {
    const playersText = lobby.players.map((p, i) => `**${i + 1}.** <@${p.id}>`).join('\n');

    return new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle('🕵️ NEXUS Mafia Lobby')
        .setDescription(
            `👑 الهوست: <@${lobby.hostId}>\n` +
            `👥 اللاعبين: \`${lobby.players.length}\`\n` +
            `📌 الحد الأدنى: \`${MIN_PLAYERS}\`\n\n` +
            `**اللاعبين:**\n${playersText}`
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: 'NEXUS COMMUNITY • Mafia Lobby' })
        .setTimestamp();
}

function gameEmbed(title, description, color = '#D4AF37') {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'NEXUS COMMUNITY • Mafia System' })
        .setTimestamp();
}

function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

function assignRoles(players) {
    const shuffled = shuffle(players);

    return shuffled.map((player, index) => {
        if (index === 0) return { ...player, role: 'Mafia', alive: true };
        if (index === 1) return { ...player, role: 'Doctor', alive: true };
        if (index === 2) return { ...player, role: 'Detective', alive: true };
        return { ...player, role: 'Citizen', alive: true };
    });
}

function alivePlayers(game) {
    return game.players.filter(p => p.alive);
}

function aliveRole(game, role) {
    return game.players.find(p => p.role === role && p.alive);
}

function targetSelect(customId, placeholder, players) {
    return row([
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addOptions(
                players.map(p => ({
                    label: p.tag.slice(0, 90),
                    value: p.id,
                    description: `اختيار ${p.tag}`.slice(0, 90)
                }))
            )
    ]);
}

async function sendRoleDM(client, game, player) {
    const member = await client.users.fetch(player.id).catch(() => null);
    if (!member) return;

    const roleInfo = {
        Mafia: {
            emoji: '🔪',
            title: 'دورك في Mafia',
            desc: 'أنت المافيا. في الليل اختر لاعبًا لقتله.',
            color: '#FF3333'
        },
        Doctor: {
            emoji: '💉',
            title: 'دورك في Mafia',
            desc: 'أنت الدكتور. في الليل اختر لاعبًا لحمايته.',
            color: '#00FF88'
        },
        Detective: {
            emoji: '🕵️',
            title: 'دورك في Mafia',
            desc: 'أنت المحقق. في الليل اختر لاعبًا للتحقق من هويته.',
            color: '#3498DB'
        },
        Citizen: {
            emoji: '👤',
            title: 'دورك في Mafia',
            desc: 'أنت مواطن. راقب، حلل، وصوّت بذكاء.',
            color: '#D4AF37'
        }
    };

    const info = roleInfo[player.role];

    await member.send({
        embeds: [
            new EmbedBuilder()
                .setColor(info.color)
                .setTitle(`${info.emoji} ${info.title}`)
                .setDescription(
                    `🎭 الدور: **${player.role}**\n\n` +
                    `${info.desc}\n\n` +
                    `🤫 لا تخبر أحدًا بدورك.`
                )
                .setFooter({ text: 'NEXUS COMMUNITY • Secret Role' })
                .setTimestamp()
        ]
    }).catch(() => {});
}

async function startNight(client, channel, gameId) {
    const game = mafiaSessions.getGame(gameId);
    if (!game) return;

    if (game.timer) clearTimeout(game.timer);

    game.phase = 'NIGHT';
    game.actions = {
        kill: null,
        protect: null,
        investigate: null
    };
    game.responded = new Set();
    game.resolved = false;

    mafiaSessions.setGame(gameId, game);

    await channel.send({
        embeds: [
            gameEmbed(
                '🌙 Mafia Night Phase',
                `حلّ الليل على المدينة...\n\n` +
                `🔪 المافيا يختار ضحية بالخاص.\n` +
                `💉 الدكتور يختار لاعبًا لحمايته.\n` +
                `🕵️ المحقق يختار لاعبًا للتحقيق.\n\n` +
                `⏱️ من لا يتفاعل خلال دقيقة يتم إقصاؤه.`
            )
        ]
    });

    const alive = alivePlayers(game);

    const mafia = aliveRole(game, 'Mafia');
    const doctor = aliveRole(game, 'Doctor');
    const detective = aliveRole(game, 'Detective');

    if (mafia) {
        const targets = alive.filter(p => p.id !== mafia.id);
        const user = await client.users.fetch(mafia.id).catch(() => null);

        if (user && targets.length) {
            await user.send({
                embeds: [
                    gameEmbed(
                        '🔪 اختر الضحية',
                        'اختر اللاعب الذي تريد قتله هذه الليلة.',
                        '#FF3333'
                    )
                ],
                components: [
                    targetSelect(`mafia_action_kill_${gameId}`, 'اختر الضحية', targets)
                ]
            }).catch(() => {});
        }
    }

    if (doctor) {
        const user = await client.users.fetch(doctor.id).catch(() => null);

        if (user) {
            await user.send({
                embeds: [
                    gameEmbed(
                        '💉 اختر من تريد حمايته',
                        'اختر لاعبًا لحمايته هذه الليلة.',
                        '#00FF88'
                    )
                ],
                components: [
                    targetSelect(`mafia_action_protect_${gameId}`, 'اختر اللاعب', alive)
                ]
            }).catch(() => {});
        }
    }

    if (detective) {
        const targets = alive.filter(p => p.id !== detective.id);
        const user = await client.users.fetch(detective.id).catch(() => null);

        if (user && targets.length) {
            await user.send({
                embeds: [
                    gameEmbed(
                        '🕵️ اختر من تريد التحقيق معه',
                        'اختر لاعبًا لمعرفة هل هو Mafia أم لا.',
                        '#3498DB'
                    )
                ],
                components: [
                    targetSelect(`mafia_action_investigate_${gameId}`, 'اختر اللاعب', targets)
                ]
            }).catch(() => {});
        }
    }

    game.timer = setTimeout(() => {
        resolveNight(client, channel, gameId, true).catch(() => {});
    }, PHASE_TIME);

    mafiaSessions.setGame(gameId, game);
}

async function resolveNight(client, channel, gameId, timeout = false) {
    const game = mafiaSessions.getGame(gameId);
    if (!game || game.resolved || game.phase !== 'NIGHT') return;

    game.resolved = true;
    if (game.timer) clearTimeout(game.timer);

    const afkEliminated = [];

    for (const role of ['Mafia', 'Doctor', 'Detective']) {
        const player = aliveRole(game, role);
        if (player && !game.responded.has(player.id)) {
            player.alive = false;
            afkEliminated.push(player);
        }
    }

    let killedPlayer = null;
    let protectedPlayer = null;
    let nightText = '';

    if (game.actions.kill) {
        killedPlayer = game.players.find(p => p.id === game.actions.kill);
    }

    if (game.actions.protect) {
        protectedPlayer = game.players.find(p => p.id === game.actions.protect);
    }

    if (killedPlayer && killedPlayer.alive) {
        if (protectedPlayer && protectedPlayer.id === killedPlayer.id) {
            nightText += `💉 الدكتور أنقذ <@${killedPlayer.id}> من الموت!\n`;
        } else {
            killedPlayer.alive = false;
            nightText += `🔪 تم قتل <@${killedPlayer.id}> أثناء الليل.\n`;
        }
    } else {
        nightText += `🌙 مرّ الليل بدون قتل.\n`;
    }

    if (afkEliminated.length) {
        nightText += `\n⏰ تم إقصاء اللاعبين غير المتفاعلين:\n`;
        nightText += afkEliminated.map(p => `• <@${p.id}>`).join('\n');
    }

    mafiaSessions.setGame(gameId, game);

    await channel.send({
        embeds: [
            gameEmbed(
                '☀️ Mafia Day Result',
                `${nightText}\n\nالمدينة تستيقظ... والشك بدأ ينتشر.`
            )
        ]
    });

    if (await checkWin(channel, gameId)) return;

    await startVoting(client, channel, gameId);
}

async function startVoting(client, channel, gameId) {
    const game = mafiaSessions.getGame(gameId);
    if (!game) return;

    if (game.timer) clearTimeout(game.timer);

    game.phase = 'VOTING';
    game.votes = {};
    game.responded = new Set();
    game.resolved = false;

    const alive = alivePlayers(game);

    mafiaSessions.setGame(gameId, game);

    await channel.send({
        embeds: [
            gameEmbed(
                '🗳️ Mafia Voting Phase',
                `حان وقت التصويت.\n\n` +
                `اختاروا من تشكون أنه المافيا.\n\n` +
                `⏱️ من لا يصوّت خلال دقيقة يتم إقصاؤه.`
            )
        ],
        components: [
            targetSelect(`mafia_vote_${gameId}`, 'صوّت على لاعب', alive)
        ]
    });

    game.timer = setTimeout(() => {
        resolveVote(client, channel, gameId, true).catch(() => {});
    }, PHASE_TIME);

    mafiaSessions.setGame(gameId, game);
}

async function resolveVote(client, channel, gameId) {
    const game = mafiaSessions.getGame(gameId);
    if (!game || game.resolved || game.phase !== 'VOTING') return;

    game.resolved = true;
    if (game.timer) clearTimeout(game.timer);

    const alive = alivePlayers(game);
    const afk = alive.filter(p => !game.responded.has(p.id));

    for (const player of afk) {
        player.alive = false;
    }

    const voteCounts = {};

    for (const targetId of Object.values(game.votes)) {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }

    let eliminated = null;

    if (Object.keys(voteCounts).length) {
        const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
        eliminated = game.players.find(p => p.id === sorted[0][0]);

        if (eliminated && eliminated.alive) {
            eliminated.alive = false;
        }
    }

    mafiaSessions.setGame(gameId, game);

    let text = '';

    if (eliminated) {
        text += `🗳️ تم التصويت على <@${eliminated.id}>.\n`;
        text += `🎭 دوره كان: **${eliminated.role}**\n`;
    } else {
        text += `لم يتم إقصاء أحد بالتصويت.\n`;
    }

    if (afk.length) {
        text += `\n⏰ تم إقصاء غير المتفاعلين:\n`;
        text += afk.map(p => `• <@${p.id}>`).join('\n');
    }

    await channel.send({
        embeds: [
            gameEmbed(
                '⚖️ نتيجة التصويت',
                text
            )
        ]
    });

    if (await checkWin(channel, gameId)) return;

    await startNight(client, channel, gameId);
}

async function checkWin(channel, gameId) {
    const game = mafiaSessions.getGame(gameId);
    if (!game) return true;

    const alive = alivePlayers(game);
    const mafiaAlive = alive.some(p => p.role === 'Mafia');
    const citizensAlive = alive.some(p => p.role !== 'Mafia');

    if (!mafiaAlive) {
        await endGame(channel, gameId, '🏆 فاز المواطنون!', 'تم كشف المافيا والقضاء عليها.');
        return true;
    }

    if (!citizensAlive || alive.length <= 2) {
        await endGame(channel, gameId, '🔪 فازت المافيا!', 'المافيا سيطرت على المدينة.');
        return true;
    }

    return false;
}

async function endGame(channel, gameId, title, description) {
    const game = mafiaSessions.getGame(gameId);
    if (!game) return;

    for (const player of game.players) {
        const isWinner =
            (title.includes('المواطنون') && player.role !== 'Mafia') ||
            (title.includes('المافيا') && player.role === 'Mafia');

        gameDB.addReward(
            { id: player.id, tag: player.tag },
            {
                coins: isWinner ? 120 : 25,
                xp: isWinner ? 70 : 20,
                win: isWinner,
                loss: !isWinner
            }
        );
    }

    mafiaSessions.deleteGame(gameId);

    await channel.send({
        embeds: [
            gameEmbed(
                title,
                `${description}\n\n` +
                `🎁 تم توزيع المكافآت حسب الفريق الفائز.`,
                '#D4AF37'
            )
        ]
    });
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        const customId = interaction.customId;

        if (
            !customId.startsWith('mafia_') &&
            !customId.startsWith('mafia_action_')
        ) return;

        if (customId === 'mafia_create') {
            if (interaction.channel.id !== GAME_CHANNEL_ID) {
                return interaction.reply({
                    content: `❌ لعبة المافيا تشتغل فقط داخل <#${GAME_CHANNEL_ID}>`,
                    flags: 64
                });
            }

            const activeSession = gameSessions.getUserSession(interaction.user.id);
            const activeLobby = mafiaSessions.getLobby(interaction.channel.id);
            const activeGame = mafiaSessions.getGameByChannel(interaction.channel.id);

            if (activeSession && activeSession.type === 'hub') {
                gameSessions.clearUserSession(interaction.user.id);
            }

            if (activeGame) {
                return interaction.reply({
                    content: '❌ يوجد لعبة Mafia شغالة بالفعل في هذا الروم.',
                    flags: 64
                });
            }

            if (activeLobby) {
                return interaction.reply({
                    content: '❌ يوجد لوبي Mafia مفتوح بالفعل في هذا الروم.',
                    flags: 64
                });
            }

            const lobby = mafiaSessions.createLobby(interaction.channel.id, interaction.user);

            const reply = await interaction.reply({
                content: '@here 🕵️ تم فتح لوبي Mafia جديد!',
                embeds: [lobbyEmbed(lobby, client)],
                components: lobbyButtons(),
                fetchReply: true
            });

            gameSessions.createSession({
                userId: interaction.user.id,
                channelId: interaction.channel.id,
                messageId: reply.id,
                type: 'mafia'
            });

            return;
        }

        if (customId === 'mafia_join') {
            const lobby = mafiaSessions.getLobby(interaction.channel.id);
            if (!lobby) {
                return interaction.reply({
                    content: '❌ لا يوجد لوبي Mafia مفتوح.',
                    flags: 64
                });
            }

            const updatedLobby = mafiaSessions.addPlayer(interaction.channel.id, interaction.user);

            return interaction.update({
                embeds: [lobbyEmbed(updatedLobby, client)],
                components: lobbyButtons()
            });
        }

        if (customId === 'mafia_leave') {
            const lobby = mafiaSessions.getLobby(interaction.channel.id);
            if (!lobby) {
                return interaction.reply({
                    content: '❌ لا يوجد لوبي Mafia مفتوح.',
                    flags: 64
                });
            }

            if (interaction.user.id === lobby.hostId) {
                return interaction.reply({
                    content: '❌ الهوست لا يستطيع الخروج. استخدم إلغاء.',
                    flags: 64
                });
            }

            const updatedLobby = mafiaSessions.removePlayer(interaction.channel.id, interaction.user.id);

            return interaction.update({
                embeds: [lobbyEmbed(updatedLobby, client)],
                components: lobbyButtons()
            });
        }

        if (customId === 'mafia_cancel') {
            const lobby = mafiaSessions.getLobby(interaction.channel.id);
            if (!lobby) {
                return interaction.reply({
                    content: '❌ لا يوجد لوبي Mafia مفتوح.',
                    flags: 64
                });
            }

            if (interaction.user.id !== lobby.hostId) {
                return interaction.reply({
                    content: '❌ فقط الهوست يستطيع الإلغاء.',
                    flags: 64
                });
            }

            mafiaSessions.deleteLobby(interaction.channel.id);
            gameSessions.clearUserSession(interaction.user.id);

            return interaction.update({
                embeds: [
                    gameEmbed(
                        '❌ تم إلغاء Mafia',
                        `تم الإلغاء بواسطة ${interaction.user}.`,
                        '#FF3333'
                    )
                ],
                components: []
            });
        }

        if (customId === 'mafia_start') {
            const lobby = mafiaSessions.getLobby(interaction.channel.id);

            if (!lobby) {
                return interaction.reply({
                    content: '❌ لا يوجد لوبي Mafia مفتوح.',
                    flags: 64
                });
            }

            if (interaction.user.id !== lobby.hostId) {
                return interaction.reply({
                    content: '❌ فقط الهوست يستطيع بدء اللعبة.',
                    flags: 64
                });
            }

            if (lobby.players.length < MIN_PLAYERS) {
                return interaction.reply({
                    content: `❌ الحد الأدنى هو ${MIN_PLAYERS} لاعبين.`,
                    flags: 64
                });
            }

            const gameId = `${interaction.channel.id}_${Date.now()}`;
            const players = assignRoles(lobby.players);

            const game = {
                id: gameId,
                channelId: interaction.channel.id,
                hostId: lobby.hostId,
                players,
                phase: 'STARTING',
                actions: {},
                votes: {},
                responded: new Set(),
                resolved: false,
                timer: null
            };

            mafiaSessions.createGame(game);
            mafiaSessions.deleteLobby(interaction.channel.id);
            gameSessions.clearUserSession(interaction.user.id);

            for (const player of players) {
                await sendRoleDM(client, game, player);
            }

            await interaction.update({
                content: players.map(p => `<@${p.id}>`).join(' '),
                embeds: [
                    gameEmbed(
                        '🕵️ بدأت لعبة Mafia',
                        `تم توزيع الأدوار بالخاص.\n\n` +
                        `👥 اللاعبين: \`${players.length}\`\n` +
                        `🌙 سيتم بدء مرحلة الليل الآن.`
                    )
                ],
                components: []
            });

            const channel = interaction.channel;
            await startNight(client, channel, gameId);
            return;
        }

        if (customId.startsWith('mafia_action_')) {
            const parts = customId.split('_');
            const action = parts[2];
            const gameId = parts.slice(3).join('_');

            const game = mafiaSessions.getGame(gameId);

            if (!game || game.phase !== 'NIGHT') {
                return interaction.reply({
                    content: '❌ هذه المرحلة انتهت أو اللعبة غير موجودة.',
                    flags: 64
                });
            }

            const player = game.players.find(p => p.id === interaction.user.id && p.alive);

            if (!player) {
                return interaction.reply({
                    content: '❌ أنت لست لاعبًا حيًا في هذه الجولة.',
                    flags: 64
                });
            }

            const targetId = interaction.values[0];

            if (action === 'kill' && player.role !== 'Mafia') return;
            if (action === 'protect' && player.role !== 'Doctor') return;
            if (action === 'investigate' && player.role !== 'Detective') return;

            if (action === 'kill') game.actions.kill = targetId;
            if (action === 'protect') game.actions.protect = targetId;

            if (action === 'investigate') {
                game.actions.investigate = targetId;

                const target = game.players.find(p => p.id === targetId);
                const isMafia = target?.role === 'Mafia';

                await interaction.reply({
                    content: `🕵️ نتيجة التحقيق: <@${targetId}> ${isMafia ? 'هو **Mafia** 🔪' : 'ليس Mafia 👤'}`,
                    flags: 64
                });
            } else {
                await interaction.reply({
                    content: '✅ تم تسجيل اختيارك.',
                    flags: 64
                });
            }

            game.responded.add(player.id);
            mafiaSessions.setGame(gameId, game);

            const required = ['Mafia', 'Doctor', 'Detective']
                .map(role => aliveRole(game, role))
                .filter(Boolean);

            const allDone = required.every(p => game.responded.has(p.id));

            if (allDone) {
                const channel = await client.channels.fetch(game.channelId).catch(() => null);
                if (channel) await resolveNight(client, channel, gameId);
            }

            return;
        }

        if (customId.startsWith('mafia_vote_')) {
            const gameId = customId.replace('mafia_vote_', '');
            const game = mafiaSessions.getGame(gameId);

            if (!game || game.phase !== 'VOTING') {
                return interaction.reply({
                    content: '❌ التصويت انتهى أو اللعبة غير موجودة.',
                    flags: 64
                });
            }

            const voter = game.players.find(p => p.id === interaction.user.id && p.alive);

            if (!voter) {
                return interaction.reply({
                    content: '❌ أنت لست لاعبًا حيًا في هذه الجولة.',
                    flags: 64
                });
            }

            const targetId = interaction.values[0];

            game.votes[interaction.user.id] = targetId;
            game.responded.add(interaction.user.id);

            mafiaSessions.setGame(gameId, game);

            await interaction.reply({
                content: `✅ تم تسجيل تصويتك ضد <@${targetId}>.`,
                flags: 64
            });

            const alive = alivePlayers(game);
            const allVoted = alive.every(p => game.responded.has(p.id));

            if (allVoted) {
                const channel = await client.channels.fetch(game.channelId).catch(() => null);
                if (channel) await resolveVote(client, channel, gameId);
            }
        }
    }
};