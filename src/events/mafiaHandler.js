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
    const b = new ButtonBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style);

    if (emoji) b.setEmoji(emoji);
    return b;
}

function row(components) {
    return new ActionRowBuilder().addComponents(components);
}

function gameEmbed(title, description, color = '#D4AF37') {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'NEXUS COMMUNITY • Mafia System' })
        .setTimestamp();
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
    const playersText = lobby.players
        .map(p => `• <@${p.id}>`)
        .join('\n');

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

function gameControlButtons(gameId) {
    return [
        row([
            btn(`mafia_reveal_${gameId}`, 'كشف دوري', '🎭', ButtonStyle.Secondary),
            btn(`mafia_night_panel_${gameId}`, 'لوحة الليل', '🌙', ButtonStyle.Primary)
        ])
    ];
}

function targetSelect(customId, placeholder, players) {
    return row([
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addOptions(
                players.slice(0, 25).map(p => ({
                    label: p.displayName?.slice(0, 90) || p.tag.slice(0, 90),
                    value: p.id,
                    description: 'اختر هذا اللاعب'
                }))
            )
    ]);
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

async function hydratePlayers(guild, players) {
    const hydrated = [];

    for (const player of players) {
        const member = await guild.members.fetch(player.id).catch(() => null);

        hydrated.push({
            ...player,
            displayName: member?.displayName || player.tag
        });
    }

    return hydrated;
}

function alivePlayers(game) {
    return game.players.filter(p => p.alive);
}

function aliveRole(game, role) {
    return game.players.find(p => p.role === role && p.alive);
}

function roleEmbed(player) {
    if (player.role === 'Mafia') {
        return gameEmbed(
            '🔪 دورك: Mafia',
            `أنت **المافيا**.\n\n` +
            `مهمتك في الليل اختيار لاعب وقتله.\n` +
            `حاول تخفي نفسك، تكذب بذكاء، وتخلي الشك يروح على غيرك.\n\n` +
            `⚠️ لا تكشف دورك لأحد.`,
            '#FF3333'
        );
    }

    if (player.role === 'Doctor') {
        return gameEmbed(
            '💉 دورك: Doctor',
            `أنت **الدكتور**.\n\n` +
            `مهمتك في الليل اختيار لاعب لحمايته من القتل.\n` +
            `اختيارك ممكن يقلب الجولة بالكامل.\n\n` +
            `⚠️ لا تكشف دورك لأحد.`,
            '#00FF88'
        );
    }

    if (player.role === 'Detective') {
        return gameEmbed(
            '🕵️ دورك: Detective',
            `أنت **المحقق**.\n\n` +
            `مهمتك في الليل اختيار لاعب مشكوك فيه.\n` +
            `النتيجة لن تكشف الدور مباشرة، لكنها تعطيك مؤشر:\n` +
            `🔪 مشبوه جدًا\n` +
            `👤 يبدو بريئًا\n\n` +
            `⚠️ لا تكشف دورك بسرعة، العبها بذكاء.`,
            '#3498DB'
        );
    }

    return gameEmbed(
        '👤 دورك: Citizen',
        `أنت **مواطن**.\n\n` +
        `ما عندك قدرة خاصة في الليل.\n` +
        `مهمتك تراقب كلام اللاعبين، تحلل، وتصوّت بذكاء.\n\n` +
        `⚠️ لا تثق بأحد بسهولة.`,
        '#D4AF37'
    );
}

async function startNight(client, channel, gameId) {
    const game = mafiaSessions.getGame(gameId);
    if (!game) return;

    if (game.timer) clearTimeout(game.timer);

    game.phase = 'NIGHT';
    game.actions = { kill: null, protect: null, investigate: null };
    game.responded = new Set();
    game.resolved = false;

    mafiaSessions.setGame(gameId, game);

    await channel.send({
        embeds: [
            gameEmbed(
                '🌙 مرحلة الليل',
                `حلّ الليل على المدينة...\n\n` +
                `🔪 المافيا يختار ضحية.\n` +
                `💉 الدكتور يختار لاعبًا للحماية.\n` +
                `🕵️ المحقق يختار لاعبًا للتحقيق.\n\n` +
                `اضغط **لوحة الليل** إذا كان لديك دور فعال.\n` +
                `⏱️ من لا يتفاعل خلال دقيقة يتم إقصاؤه.`
            )
        ],
        components: gameControlButtons(gameId)
    });

    game.timer = setTimeout(() => {
        resolveNight(client, channel, gameId).catch(() => {});
    }, PHASE_TIME);

    mafiaSessions.setGame(gameId, game);
}

async function resolveNight(client, channel, gameId) {
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

    let text = '';

    const killedPlayer = game.actions.kill
        ? game.players.find(p => p.id === game.actions.kill)
        : null;

    const protectedPlayer = game.actions.protect
        ? game.players.find(p => p.id === game.actions.protect)
        : null;

    if (killedPlayer && killedPlayer.alive) {
        if (protectedPlayer && protectedPlayer.id === killedPlayer.id) {
            text += `💉 الدكتور أنقذ <@${killedPlayer.id}> من الموت!\n`;
        } else {
            killedPlayer.alive = false;
            text += `🔪 تم قتل <@${killedPlayer.id}> أثناء الليل.\n`;
        }
    } else {
        text += `🌙 مرّ الليل بدون قتل.\n`;
    }

    if (afkEliminated.length) {
        text += `\n⏰ تم إقصاء غير المتفاعلين:\n`;
        text += afkEliminated.map(p => `• <@${p.id}>`).join('\n');
    }

    mafiaSessions.setGame(gameId, game);

    await channel.send({
        embeds: [
            gameEmbed(
                '☀️ نتيجة الليل',
                `${text}\n\nالمدينة تستيقظ... والشك بدأ ينتشر.`
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
                '🗳️ مرحلة التصويت',
                `حان وقت التصويت.\n\n` +
                `اختاروا اللاعب الذي تشكون أنه المافيا.\n\n` +
                `⏱️ من لا يصوّت خلال دقيقة يتم إقصاؤه.`
            )
        ],
        components: [
            targetSelect(`mafia_vote_${gameId}`, 'صوّت على لاعب', alive)
        ]
    });

    game.timer = setTimeout(() => {
        resolveVote(client, channel, gameId).catch(() => {});
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
                `${description}\n\n🎁 تم توزيع المكافآت حسب الفريق الفائز.`
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
            await interaction.deferUpdate();

            const lobby = mafiaSessions.getLobby(interaction.channel.id);

            if (!lobby) {
                return interaction.followUp({
                    content: '❌ لا يوجد لوبي Mafia مفتوح.',
                    flags: 64
                });
            }

            if (interaction.user.id !== lobby.hostId) {
                return interaction.followUp({
                    content: '❌ فقط الهوست يستطيع بدء اللعبة.',
                    flags: 64
                });
            }

            if (lobby.players.length < MIN_PLAYERS) {
                return interaction.followUp({
                    content: `❌ الحد الأدنى هو ${MIN_PLAYERS} لاعبين.`,
                    flags: 64
                });
            }

            const gameId = `${interaction.channel.id}_${Date.now()}`;
            const hydratedPlayers = await hydratePlayers(interaction.guild, lobby.players);
            const players = assignRoles(hydratedPlayers);

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

            await interaction.message.edit({
                content: players.map(p => `<@${p.id}>`).join(' '),
                embeds: [
                    gameEmbed(
                        '🕵️ بدأت لعبة Mafia',
                        `تم توزيع الأدوار.\n\n` +
                        `👥 اللاعبين: \`${players.length}\`\n\n` +
                        `🎭 اضغط زر **كشف دوري** لتعرف دورك برسالة لا يراها غيرك.\n` +
                        `🌙 سيتم بدء مرحلة الليل الآن.`
                    )
                ],
                components: gameControlButtons(gameId)
            });

            await startNight(client, interaction.channel, gameId);
            return;
        }

        if (customId.startsWith('mafia_reveal_')) {
            const gameId = customId.replace('mafia_reveal_', '');
            const game = mafiaSessions.getGame(gameId);

            if (!game) {
                return interaction.reply({
                    content: '❌ اللعبة غير موجودة.',
                    flags: 64
                });
            }

            const player = game.players.find(p => p.id === interaction.user.id);

            if (!player) {
                return interaction.reply({
                    content: '❌ أنت لست داخل هذه اللعبة.',
                    flags: 64
                });
            }

            return interaction.reply({
                embeds: [roleEmbed(player)],
                flags: 64
            });
        }

        if (customId.startsWith('mafia_night_panel_')) {
            const gameId = customId.replace('mafia_night_panel_', '');
            const game = mafiaSessions.getGame(gameId);

            if (!game || game.phase !== 'NIGHT') {
                return interaction.reply({
                    content: '❌ لوحة الليل متاحة فقط أثناء الليل.',
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

            const alive = alivePlayers(game);

            if (player.role === 'Mafia') {
                const targets = alive.filter(p => p.id !== player.id);

                return interaction.reply({
                    embeds: [
                        gameEmbed(
                            '🔪 اختر الضحية',
                            'اختر اللاعب الذي تريد قتله هذه الليلة.',
                            '#FF3333'
                        )
                    ],
                    components: [
                        targetSelect(`mafia_action_kill_${gameId}`, 'اختر الضحية', targets)
                    ],
                    flags: 64
                });
            }

            if (player.role === 'Doctor') {
                return interaction.reply({
                    embeds: [
                        gameEmbed(
                            '💉 اختر الحماية',
                            'اختر لاعبًا لحمايته هذه الليلة.',
                            '#00FF88'
                        )
                    ],
                    components: [
                        targetSelect(`mafia_action_protect_${gameId}`, 'اختر اللاعب', alive)
                    ],
                    flags: 64
                });
            }

            if (player.role === 'Detective') {
                const targets = alive.filter(p => p.id !== player.id);

                return interaction.reply({
                    embeds: [
                        gameEmbed(
                            '🕵️ اختر التحقيق',
                            'اختر اللاعب الذي تشك فيه. النتيجة ستظهر كمؤشر وليس كشف مباشر للدور.',
                            '#3498DB'
                        )
                    ],
                    components: [
                        targetSelect(`mafia_action_investigate_${gameId}`, 'اختر اللاعب المشبوه', targets)
                    ],
                    flags: 64
                });
            }

            return interaction.reply({
                content: '👤 أنت مواطن، لا يوجد لديك فعل في الليل. انتظر مرحلة التصويت.',
                flags: 64
            });
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

            if (action === 'kill' && player.role !== 'Mafia') return;
            if (action === 'protect' && player.role !== 'Doctor') return;
            if (action === 'investigate' && player.role !== 'Detective') return;

            const targetId = interaction.values[0];
            const target = game.players.find(p => p.id === targetId);

            if (action === 'kill') game.actions.kill = targetId;
            if (action === 'protect') game.actions.protect = targetId;

            if (action === 'investigate') {
                game.actions.investigate = targetId;

                const isMafia = target?.role === 'Mafia';

                await interaction.reply({
                    embeds: [
                        gameEmbed(
                            '🕵️ نتيجة التحقيق',
                            `اللاعب: <@${targetId}>\n\n` +
                            `${isMafia
                                ? '🔪 هذا اللاعب **مشبوه جدًا**.\nراقبه، لكن لا تكشف نفسك بسرعة.'
                                : '👤 هذا اللاعب **يبدو بريئًا**.\nلكن لا تثق بأحد 100%.'}`,
                            isMafia ? '#FF3333' : '#3498DB'
                        )
                    ],
                    flags: 64
                });
            } else {
                await interaction.reply({
                    content: `✅ تم تسجيل اختيارك على <@${targetId}>.`,
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