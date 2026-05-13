const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const gameDB = require('../utils/gameDB');
const gameSessions = require('../utils/gameSessions');
const gameQuestions = require('../data/gameQuestions');

const GAME_CHANNEL_ID = '1429135776289132544';
const GAME_TIMEOUT = 30000;

const cooldowns = new Map();

const GAME_COOLDOWNS = {
    game_dice: 30 * 1000,
    game_coinflip: 30 * 1000,
    game_slots: 45 * 1000,
    game_blackjack: 60 * 1000,
    game_guess: 45 * 1000,
    game_quiz: 45 * 1000,
    game_truth: 30 * 1000,
    game_wyr: 30 * 1000,
    game_roulette: 45 * 1000,
    game_mines: 60 * 1000,
    game_fasttype: 60 * 1000
};

function button(id, label, emoji, style = ButtonStyle.Primary) {
    const btn = new ButtonBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style);

    if (emoji) btn.setEmoji(emoji);
    return btn;
}

function row(buttons) {
    return new ActionRowBuilder().addComponents(buttons);
}

function closeRow() {
    return row([
        button('nxg_close', 'إغلاق', '❌', ButtonStyle.Danger)
    ]);
}

function disableComponents(components) {
    return components.map(component => {
        const newRow = ActionRowBuilder.from(component);
        newRow.components.forEach(btn => btn.setDisabled(true));
        return newRow;
    });
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function checkCooldown(userId, gameId) {
    const key = `${userId}:${gameId}`;
    const cooldownTime = GAME_COOLDOWNS[gameId];

    if (!cooldownTime) return { active: false, remaining: 0 };

    const now = Date.now();
    const expiresAt = cooldowns.get(key) || 0;

    if (now < expiresAt) {
        return {
            active: true,
            remaining: Math.ceil((expiresAt - now) / 1000)
        };
    }

    cooldowns.set(key, now + cooldownTime);
    return { active: false, remaining: 0 };
}

function embed(title, description, image, color = '#D4AF37') {
    const e = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'NEXUS Game System • لديك 30 ثانية للتفاعل' })
        .setTimestamp();

    if (image) e.setImage(image);
    return e;
}

function reward(user, { coins, xp, win, loss }) {
    return gameDB.addReward(user, {
        coins,
        xp,
        win,
        loss
    });
}

function nextGameButtons() {
    return [
        row([
            button('game_dice', 'Dice', '🎲'),
            button('game_coinflip', 'Coinflip', '🪙'),
            button('game_slots', 'Slots', '🎰', ButtonStyle.Success)
        ]),
        row([
            button('game_blackjack', 'Blackjack', '🃏'),
            button('game_guess', 'Guess Number', '🔢'),
            button('game_quiz', 'Quiz', '🧠', ButtonStyle.Success)
        ]),
        row([
            button('game_truth', 'Truth/Dare', '❓'),
            button('game_wyr', 'Would You Rather', '🤔'),
            button('game_roulette', 'Roulette', '🎯', ButtonStyle.Danger)
        ]),
        row([
            button('game_mines', 'Mines', '💣', ButtonStyle.Danger),
            button('game_fasttype', 'Fast Type', '⚡', ButtonStyle.Success),
            button('game_profile', 'Profile', '👤', ButtonStyle.Secondary)
        ])
    ];
}

async function startInteractiveGame(interaction, gameData, onChoice) {
    await interaction.update({
        embeds: [gameData.embed],
        components: gameData.components
    });

    const message = await interaction.message.fetch().catch(() => null);
    if (!message) return;

    const collector = message.createMessageComponentCollector({
        time: GAME_TIMEOUT
    });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({
                content: '❌ هذه اللعبة ليست لك.',
                flags: 64
            });
        }

        if (i.customId === 'nxg_close') {
            collector.stop('closed');
            gameSessions.clearSession(i.channel.id);

            return i.update({
                embeds: [
                    embed(
                        '❌ تم إغلاق اللعبة',
                        `${i.user} أغلق اللعبة الحالية.`,
                        null,
                        '#FF3B3B'
                    )
                ],
                components: []
            });
        }

        const result = await onChoice(i);

        if (!result) return;

        collector.stop('finished');
        gameSessions.clearSession(i.channel.id);

        return i.update({
            embeds: [result],
            components: nextGameButtons()
        });
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'closed' || reason === 'finished') return;

        gameSessions.clearSession(interaction.channel.id);

        await message.edit({
            embeds: [
                embed(
                    '⌛ انتهى الوقت',
                    'لم يتم اختيار أي جواب خلال 30 ثانية، تم تعطيل اللعبة.',
                    null,
                    '#FFCC00'
                )
            ],
            components: disableComponents(gameData.components)
        }).catch(() => {});
    });
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('game_')) return;

        if (interaction.channel.id !== GAME_CHANNEL_ID) {
            return interaction.reply({
                content: `❌ يمكنك استخدام الألعاب فقط داخل <#${GAME_CHANNEL_ID}>`,
                flags: 64
            });
        }

        const user = interaction.user;
        const customId = interaction.customId;

        const activeSession = gameSessions.getSession(interaction.channel.id);

        if (activeSession && activeSession.userId !== user.id) {
            return interaction.reply({
                content: `⏳ يوجد لعبة أو قائمة مفتوحة حاليًا بواسطة <@${activeSession.userId}>.`,
                flags: 64
            });
        }

        if (customId === 'game_profile') {
            const player = gameDB.getPlayer(user);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#D4AF37')
                        .setTitle('👤 NEXUS Player Profile')
                        .setDescription(`${user}`)
                        .addFields(
                            { name: '💰 Coins', value: `\`${player.coins}\``, inline: true },
                            { name: '⭐ Level', value: `\`${player.level}\``, inline: true },
                            { name: '✨ XP', value: `\`${player.xp}\``, inline: true },
                            { name: '🏆 Wins', value: `\`${player.wins}\``, inline: true },
                            { name: '💀 Losses', value: `\`${player.losses}\``, inline: true },
                            { name: '🔥 Streak', value: `\`${player.streak}\``, inline: true }
                        )
                        .setThumbnail(user.displayAvatarURL())
                        .setFooter({ text: 'NEXUS COMMUNITY • Player Stats' })
                        .setTimestamp()
                ],
                flags: 64
            });
        }

        if (customId === 'game_leaderboard') {
            const leaderboard = gameDB.getLeaderboard();

            const description = leaderboard.length
                ? leaderboard
                    .map((player, index) =>
                        `**#${index + 1}** <@${player.userId}> — 💰 \`${player.coins}\` | ⭐ \`${player.level}\``
                    )
                    .join('\n')
                : 'لا يوجد لاعبين حتى الآن.';

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#D4AF37')
                        .setTitle('🏆 NEXUS Game Leaderboard')
                        .setDescription(description)
                        .setFooter({ text: 'NEXUS COMMUNITY • Top Players' })
                        .setTimestamp()
                ],
                flags: 64
            });
        }

        const cooldown = checkCooldown(user.id, customId);

        if (cooldown.active) {
            return interaction.reply({
                embeds: [
                    embed(
                        '⏳ NEXUS Cooldown System',
                        `${user} انتظر قبل لعب نفس اللعبة مرة ثانية.\n\n⏱️ المتبقي: \`${cooldown.remaining}\` ثانية`,
                        null,
                        '#FF3B3B'
                    )
                ],
                flags: 64
            });
        }

        gameSessions.setSession(interaction.channel.id, {
            userId: user.id,
            type: customId,
            duration: GAME_TIMEOUT + 5000
        });

        if (customId === 'game_dice') {
            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '🎲 NEXUS Dice',
                        `${user}\n\nاختر رقم من **1 إلى 6**.\nإذا طلع نفس رقم النرد تربح.`,
                        'https://images.unsplash.com/photo-1606167668584-78701c57f13d'
                    ),
                    components: [
                        row([1, 2, 3].map(n => button(`nxg_dice_${n}`, String(n)))),
                        row([4, 5, 6].map(n => button(`nxg_dice_${n}`, String(n)))),
                        closeRow()
                    ]
                },
                async i => {
                    const pick = Number(i.customId.split('_')[2]);
                    const roll = random(1, 6);
                    const win = pick === roll;
                    const coins = win ? 80 : -15;
                    const xp = win ? 35 : 8;
                    const player = reward(user, { coins, xp, win, loss: !win });

                    return embed(
                        win ? '✅ ربحت | Dice' : '❌ خسرت | Dice',
                        `${user}\n\nاختيارك: **${pick}**\nالنرد طلع: **${roll}**\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1606167668584-78701c57f13d',
                        win ? '#00FF88' : '#FF3333'
                    );
                }
            );
        }

        if (customId === 'game_coinflip') {
            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '🪙 NEXUS Coinflip',
                        `${user}\n\nاختر وجه العملة.`,
                        'https://images.unsplash.com/photo-1621416894569-0f39ed31d247'
                    ),
                    components: [
                        row([
                            button('nxg_coin_heads', 'Heads', '👑'),
                            button('nxg_coin_tails', 'Tails', '🪙'),
                            button('nxg_close', 'إغلاق', '❌', ButtonStyle.Danger)
                        ])
                    ]
                },
                async i => {
                    const pick = i.customId.split('_')[2];
                    const result = Math.random() < 0.5 ? 'heads' : 'tails';
                    const win = pick === result;
                    const coins = win ? 40 : -10;
                    const xp = win ? 20 : 6;
                    const player = reward(user, { coins, xp, win, loss: !win });

                    return embed(
                        win ? '✅ ربحت | Coinflip' : '❌ خسرت | Coinflip',
                        `${user}\n\nاختيارك: **${pick}**\nالنتيجة: **${result}**\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1621416894569-0f39ed31d247',
                        win ? '#00FF88' : '#FF3333'
                    );
                }
            );
        }

        if (customId === 'game_slots') {
            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '🎰 NEXUS Slots',
                        `${user}\n\nاضغط **Spin** لتشغيل ماكينة الحظ.`,
                        'https://images.unsplash.com/photo-1596838132731-3301c3fd4317'
                    ),
                    components: [
                        row([
                            button('nxg_slots_spin', 'Spin', '🎰', ButtonStyle.Success),
                            button('nxg_close', 'إغلاق', '❌', ButtonStyle.Danger)
                        ])
                    ]
                },
                async () => {
                    const icons = ['🍒', '🍋', '💎', '7️⃣', '⭐'];
                    const slots = [randomItem(icons), randomItem(icons), randomItem(icons)];

                    const jackpot = slots[0] === slots[1] && slots[1] === slots[2];
                    const smallWin = slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2];
                    const win = jackpot || smallWin;

                    const coins = jackpot ? 180 : smallWin ? 55 : -20;
                    const xp = jackpot ? 70 : smallWin ? 30 : 10;
                    const player = reward(user, { coins, xp, win, loss: !win });

                    return embed(
                        jackpot ? '💎 JACKPOT | Slots' : win ? '✅ ربحت | Slots' : '❌ خسرت | Slots',
                        `${user}\n\n${slots.join(' │ ')}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1596838132731-3301c3fd4317',
                        win ? '#00FF88' : '#FF3333'
                    );
                }
            );
        }

        if (customId === 'game_blackjack') {
            const playerStart = random(2, 11) + random(2, 11);
            const dealer = random(14, 21);

            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '🃏 NEXUS Blackjack',
                        `${user}\n\nيدك الحالية: **${playerStart}**\nيد الديلر مخفية.\n\nاختر Hit أو Stand.`,
                        'https://images.unsplash.com/photo-1511193311914-0346f16efe90'
                    ),
                    components: [
                        row([
                            button(`nxg_blackjack_hit_${playerStart}_${dealer}`, 'Hit', '➕'),
                            button(`nxg_blackjack_stand_${playerStart}_${dealer}`, 'Stand', '🛑'),
                            button('nxg_close', 'إغلاق', '❌', ButtonStyle.Danger)
                        ])
                    ]
                },
                async i => {
                    const parts = i.customId.split('_');
                    const action = parts[2];
                    let playerTotal = Number(parts[3]);
                    const dealerTotal = Number(parts[4]);

                    if (action === 'hit') playerTotal += random(2, 11);

                    const win = playerTotal <= 21 && (playerTotal > dealerTotal || dealerTotal > 21);
                    const draw = playerTotal === dealerTotal;

                    const coins = draw ? 5 : win ? 70 : -25;
                    const xp = draw ? 12 : win ? 40 : 10;
                    const player = reward(user, { coins, xp, win, loss: !win && !draw });

                    return embed(
                        draw ? '⚖️ تعادل | Blackjack' : win ? '✅ ربحت | Blackjack' : '❌ خسرت | Blackjack',
                        `${user}\n\nقرارك: **${action}**\nيدك: **${playerTotal}**\nيد الديلر: **${dealerTotal}**\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1511193311914-0346f16efe90',
                        win ? '#00FF88' : draw ? '#3498DB' : '#FF3333'
                    );
                }
            );
        }

        if (customId === 'game_guess') {
            const max = 5;
            const target = random(1, max);

            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '🔢 NEXUS Guess Number',
                        `${user}\n\nاختر رقم من **1 إلى ${max}**.`,
                        'https://images.unsplash.com/photo-1509228468518-180dd4864904'
                    ),
                    components: [
                        row([1, 2, 3, 4, 5].map(n => button(`nxg_guess_${target}_${n}`, String(n)))),
                        closeRow()
                    ]
                },
                async i => {
                    const parts = i.customId.split('_');
                    const targetNumber = Number(parts[2]);
                    const pick = Number(parts[3]);
                    const win = targetNumber === pick;

                    const coins = win ? 90 : -20;
                    const xp = win ? 40 : 10;
                    const player = reward(user, { coins, xp, win, loss: !win });

                    return embed(
                        win ? '✅ ربحت | Guess Number' : '❌ خسرت | Guess Number',
                        `${user}\n\nاختيارك: **${pick}**\nالرقم الصحيح: **${targetNumber}**\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1509228468518-180dd4864904',
                        win ? '#00FF88' : '#FF3333'
                    );
                }
            );
        }

        if (customId === 'game_quiz') {
            const question = randomItem(gameQuestions.quiz);
            const correctIndex = question.correct;

            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '🧠 NEXUS Quiz',
                        `${user}\n\n${question.question}\n\nA) ${question.answers[0]}\nB) ${question.answers[1]}\nC) ${question.answers[2]}\nD) ${question.answers[3]}`,
                        'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b'
                    ),
                    components: [
                        row([
                            button(`nxg_quiz_${correctIndex}_0`, 'A'),
                            button(`nxg_quiz_${correctIndex}_1`, 'B'),
                            button(`nxg_quiz_${correctIndex}_2`, 'C'),
                            button(`nxg_quiz_${correctIndex}_3`, 'D')
                        ]),
                        closeRow()
                    ]
                },
                async i => {
                    const parts = i.customId.split('_');
                    const correct = Number(parts[2]);
                    const chosen = Number(parts[3]);
                    const win = chosen === correct;

                    const coins = win ? 70 : -15;
                    const xp = win ? 35 : 10;
                    const player = reward(user, { coins, xp, win, loss: !win });

                    return embed(
                        win ? '✅ إجابة صحيحة | Quiz' : '❌ إجابة خاطئة | Quiz',
                        `${user}\n\nالإجابة الصحيحة: **${question.answers[correct]}**\nإجابتك: **${question.answers[chosen]}**\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b',
                        win ? '#00FF88' : '#FF3333'
                    );
                }
            );
        }

        if (customId === 'game_truth') {
            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '❓ NEXUS Truth / Dare',
                        `${user}\n\nاختر Truth أو Dare لتحصل على التحدي.`,
                        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7'
                    ),
                    components: [
                        row([
                            button('nxg_truth_pick', 'Truth', '❓'),
                            button('nxg_dare_pick', 'Dare', '🔥'),
                            button('nxg_close', 'إغلاق', '❌', ButtonStyle.Danger)
                        ])
                    ]
                },
                async i => {
                    const isTruth = i.customId === 'nxg_truth_pick';
                    const challenge = randomItem(gameQuestions.truthDare);

                    const coins = 15;
                    const xp = 12;
                    const player = reward(user, { coins, xp, win: true, loss: false });

                    return embed(
                        isTruth ? '❓ Truth' : '🔥 Dare',
                        `${user}\n\n${challenge}\n\n💰 Coins: \`+${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7',
                        '#00FF88'
                    );
                }
            );
        }

        if (customId === 'game_wyr') {
            const pair = randomItem(gameQuestions.wouldYouRather);

            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '🤔 NEXUS Would You Rather',
                        `${user}\n\nA) **${pair[0]}**\n\nB) **${pair[1]}**\n\nاختر جوابك للحصول على مكافأة المشاركة.`,
                        'https://images.unsplash.com/photo-1493612276216-ee3925520721'
                    ),
                    components: [
                        row([
                            button('nxg_wyr_A', 'A'),
                            button('nxg_wyr_B', 'B'),
                            button('nxg_close', 'إغلاق', '❌', ButtonStyle.Danger)
                        ])
                    ]
                },
                async i => {
                    const answer = i.customId.split('_')[2];

                    const coins = 10;
                    const xp = 5;
                    const player = reward(user, { coins, xp, win: true, loss: false });

                    return embed(
                        '✅ Would You Rather',
                        `${user}\n\nتم تسجيل جوابك: **${answer}**\n\n💰 Coins: \`+${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1493612276216-ee3925520721',
                        '#00FF88'
                    );
                }
            );
        }

        if (customId === 'game_roulette') {
            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '🎯 NEXUS Roulette',
                        `${user}\n\nاختر لون أو رقم.`,
                        'https://images.unsplash.com/photo-1606167668584-78701c57f13d'
                    ),
                    components: [
                        row([
                            button('nxg_roulette_red', 'Red', '🔴', ButtonStyle.Danger),
                            button('nxg_roulette_black', 'Black', '⚫'),
                            button('nxg_roulette_green', 'Green', '🟢', ButtonStyle.Success)
                        ]),
                        row([
                            button('nxg_roulette_1', '1'),
                            button('nxg_roulette_2', '2'),
                            button('nxg_roulette_3', '3')
                        ]),
                        closeRow()
                    ]
                },
                async i => {
                    const pick = i.customId.replace('nxg_roulette_', '');
                    const resultColor = randomItem(['red', 'black', 'green']);
                    const resultNumber = String(random(1, 3));
                    const win = pick === resultColor || pick === resultNumber;

                    const coins = win ? 65 : -30;
                    const xp = win ? 30 : 10;
                    const player = reward(user, { coins, xp, win, loss: !win });

                    return embed(
                        win ? '✅ ربحت | Roulette' : '❌ خسرت | Roulette',
                        `${user}\n\nاختيارك: **${pick}**\nالنتيجة: **${resultColor} ${resultNumber}**\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1606167668584-78701c57f13d',
                        win ? '#00FF88' : '#FF3333'
                    );
                }
            );
        }

        if (customId === 'game_mines') {
            const bomb = random(1, 9);

            return startInteractiveGame(
                interaction,
                {
                    embed: embed(
                        '💣 NEXUS Mines',
                        `${user}\n\nاختر مربع واحد وحاول تتجنب القنبلة.`,
                        'https://images.unsplash.com/photo-1511512578047-dfb367046420'
                    ),
                    components: [
                        row([1, 2, 3].map(n => button(`nxg_mines_${bomb}_${n}`, String(n)))),
                        row([4, 5, 6].map(n => button(`nxg_mines_${bomb}_${n}`, String(n)))),
                        row([7, 8, 9].map(n => button(`nxg_mines_${bomb}_${n}`, String(n)))),
                        closeRow()
                    ]
                },
                async i => {
                    const parts = i.customId.split('_');
                    const bombNumber = Number(parts[2]);
                    const pick = Number(parts[3]);
                    const win = pick !== bombNumber;

                    const coins = win ? 55 : -35;
                    const xp = win ? 25 : 12;
                    const player = reward(user, { coins, xp, win, loss: !win });

                    return embed(
                        win ? '✅ نجوت | Mines' : '💥 انفجر اللغم | Mines',
                        `${user}\n\nاختيارك: **${pick}**\nالقنبلة كانت في: **${bombNumber}**\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1511512578047-dfb367046420',
                        win ? '#00FF88' : '#FF3333'
                    );
                }
            );
        }

        if (customId === 'game_fasttype') {
            const word = randomItem(gameQuestions.fastWords);

            await interaction.update({
                embeds: [
                    embed(
                        '⚡ NEXUS Fast Type',
                        `${user}\n\nاكتب الكلمة التالية خلال **30 ثانية**:\n\n**${word}**`,
                        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4'
                    )
                ],
                components: [closeRow()]
            });

            const message = await interaction.message.fetch().catch(() => null);

            const componentCollector = message.createMessageComponentCollector({
                time: GAME_TIMEOUT
            });

            componentCollector.on('collect', async i => {
                if (i.user.id !== user.id) {
                    return i.reply({
                        content: '❌ هذه اللعبة ليست لك.',
                        flags: 64
                    });
                }

                if (i.customId === 'nxg_close') {
                    componentCollector.stop('closed');
                    gameSessions.clearSession(i.channel.id);

                    return i.update({
                        embeds: [
                            embed(
                                '❌ تم إغلاق اللعبة',
                                `${i.user} أغلق لعبة Fast Type.`,
                                null,
                                '#FF3B3B'
                            )
                        ],
                        components: []
                    });
                }
            });

            const filter = msg =>
                msg.author.id === user.id &&
                msg.channel.id === interaction.channel.id;

            const msgCollector = interaction.channel.createMessageCollector({
                filter,
                time: GAME_TIMEOUT,
                max: 1
            });

            msgCollector.on('collect', msg => {
                const correct = msg.content.trim() === word;

                const coins = correct ? 75 : -15;
                const xp = correct ? 35 : 8;
                const player = reward(user, { coins, xp, win: correct, loss: !correct });

                componentCollector.stop('finished');
                gameSessions.clearSession(interaction.channel.id);

                interaction.followUp({
                    embeds: [
                        embed(
                            correct ? '✅ صحيح | Fast Type' : '❌ خطأ | Fast Type',
                            `${user}\n\nالمطلوب: **${word}**\nكتابتك: **${msg.content}**\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                            'https://images.unsplash.com/photo-1515879218367-8466d910aaa4',
                            correct ? '#00FF88' : '#FF3333'
                        )
                    ],
                    components: nextGameButtons()
                });
            });

            msgCollector.on('end', collected => {
                if (collected.size > 0) return;

                const coins = -10;
                const xp = 5;
                reward(user, { coins, xp, win: false, loss: true });

                componentCollector.stop('timeout');
                gameSessions.clearSession(interaction.channel.id);

                interaction.followUp({
                    embeds: [
                        embed(
                            '⌛ انتهى الوقت | Fast Type',
                            `${user}\n\nلم تكتب الكلمة خلال 30 ثانية.\n\n💰 Coins: \`${coins}\`\n⭐ XP: \`+${xp}\``,
                            'https://images.unsplash.com/photo-1515879218367-8466d910aaa4',
                            '#FFCC00'
                        )
                    ],
                    components: nextGameButtons()
                });
            });
        }
    }
};