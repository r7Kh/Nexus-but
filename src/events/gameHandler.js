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

function btn(id, label, emoji, style = ButtonStyle.Primary, disabled = false) {
    const button = new ButtonBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style)
        .setDisabled(disabled);

    if (emoji) button.setEmoji(emoji);
    return button;
}

function row(buttons) {
    return new ActionRowBuilder().addComponents(buttons);
}

function closeButton() {
    return btn('game_close_menu', 'إغلاق', '❌', ButtonStyle.Danger);
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

function embed(title, description, image = null, color = '#D4AF37') {
    const e = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'NEXUS Game System • Interactive Mode' })
        .setTimestamp();

    if (image) e.setImage(image);
    return e;
}

function reward(user, { coins, xp, win, loss }) {
    return gameDB.addReward(user, { coins, xp, win, loss });
}

function mainButtons() {
    return [
        row([
            btn('game_dice', 'Dice', '🎲'),
            btn('game_coinflip', 'Coinflip', '🪙'),
            btn('game_slots', 'Slots', '🎰', ButtonStyle.Success)
        ]),
        row([
            btn('game_blackjack', 'Blackjack', '🃏'),
            btn('game_guess', 'Guess Number', '🔢'),
            btn('game_quiz', 'Quiz', '🧠', ButtonStyle.Success)
        ]),
        row([
            btn('game_truth', 'Truth/Dare', '❓'),
            btn('game_wyr', 'Would You Rather', '🤔'),
            btn('game_roulette', 'Roulette', '🎯', ButtonStyle.Danger)
        ]),
        row([
            btn('game_mines', 'Mines', '💣', ButtonStyle.Danger),
            btn('game_fasttype', 'Fast Type', '⚡', ButtonStyle.Success),
            btn('mafia_create', 'Mafia', '🕵️', ButtonStyle.Danger)
        ]),
        row([
            btn('game_profile', 'Profile', '👤', ButtonStyle.Secondary),
            btn('game_leaderboard', 'Leaderboard', '🏆', ButtonStyle.Secondary),
            closeButton()
        ])
    ];
}

async function updateGame(interaction, title, description, components, image = null, color = '#D4AF37') {
    return interaction.update({
        embeds: [embed(title, description, image, color)],
        components
    });
}

function createBombs() {
    const bombs = new Set();

    while (bombs.size < 2) {
        bombs.add(random(1, 9));
    }

    return [...bombs];
}

function minesMultiplier(safeCount) {
    const multipliers = {
        0: 0,
        1: 25,
        2: 55,
        3: 95,
        4: 145,
        5: 210,
        6: 300,
        7: 450
    };

    return multipliers[safeCount] || 0;
}

function minesGrid({ bombs, opened, exploded = null }) {
    const components = [];

    for (let i = 1; i <= 9; i += 3) {
        const buttons = [];

        for (let n = i; n < i + 3; n++) {
            const isOpened = opened.includes(n);
            const isBomb = bombs.includes(n);
            const isExploded = exploded === n;

            let label = String(n);
            let emoji = '⬛';
            let style = ButtonStyle.Secondary;
            let disabled = isOpened || Boolean(exploded);

            if (isOpened && !isBomb) {
                emoji = '💎';
                style = ButtonStyle.Success;
            }

            if ((exploded && isBomb) || isExploded) {
                emoji = '💣';
                style = ButtonStyle.Danger;
                disabled = true;
            }

            buttons.push(
                btn(
                    `nxg_mines_pick_${bombs.join('-')}_${opened.join('-') || 'none'}_${n}`,
                    label,
                    emoji,
                    style,
                    disabled
                )
            );
        }

        components.push(row(buttons));
    }

    const currentReward = minesMultiplier(opened.length);

    components.push(
        row([
            btn(
                `nxg_mines_cashout_${bombs.join('-')}_${opened.join('-') || 'none'}`,
                `Cashout +${currentReward}`,
                '💰',
                ButtonStyle.Success,
                opened.length === 0 || Boolean(exploded)
            ),
            closeButton()
        ])
    );

    return components;
}

function cardsTotal(cards) {
    return cards.reduce((sum, card) => sum + card, 0);
}

function drawCard() {
    return random(2, 11);
}

function blackjackRows(playerCards, dealerCards) {
    return [
        row([
            btn(
                `nxg_blackjack_hit_${playerCards.join('-')}_${dealerCards.join('-')}`,
                'Hit',
                '➕',
                ButtonStyle.Primary
            ),
            btn(
                `nxg_blackjack_stand_${playerCards.join('-')}_${dealerCards.join('-')}`,
                'Stand',
                '🛑',
                ButtonStyle.Danger
            )
        ]),
        row([closeButton()])
    ];
}

function finishBlackjack(user, interaction, playerCards, dealerCards, action) {
    let playerTotal = cardsTotal(playerCards);
    let dealerTotal = cardsTotal(dealerCards);

    while (dealerTotal < 17) {
        dealerCards.push(drawCard());
        dealerTotal = cardsTotal(dealerCards);
    }

    const playerBust = playerTotal > 21;
    const dealerBust = dealerTotal > 21;

    let resultTitle = '';
    let resultText = '';
    let coins = 0;
    let xp = 0;
    let win = false;
    let loss = false;
    let color = '#D4AF37';

    if (playerBust) {
        resultTitle = '💥 Bust | Blackjack';
        resultText = 'تجاوزت 21... الديلر ضحك عليك.';
        coins = -35;
        xp = 10;
        loss = true;
        color = '#FF3333';
    } else if (dealerBust) {
        resultTitle = '✅ ربحت | Blackjack';
        resultText = 'الديلر تجاوز 21، الفوز إلك.';
        coins = 90;
        xp = 45;
        win = true;
        color = '#00FF88';
    } else if (playerTotal > dealerTotal) {
        resultTitle = '✅ ربحت | Blackjack';
        resultText = 'لعبتها صح وتغلبت على الديلر.';
        coins = playerTotal === 21 ? 120 : 80;
        xp = playerTotal === 21 ? 60 : 40;
        win = true;
        color = '#00FF88';
    } else if (playerTotal === dealerTotal) {
        resultTitle = '⚖️ تعادل | Blackjack';
        resultText = 'تعادل بارد... بس أحسن من خسارة.';
        coins = 10;
        xp = 15;
        color = '#3498DB';
    } else {
        resultTitle = '❌ خسرت | Blackjack';
        resultText = 'الديلر كان أقوى منك هالمرة.';
        coins = -25;
        xp = 10;
        loss = true;
        color = '#FF3333';
    }

    const player = reward(user, { coins, xp, win, loss });

    return interaction.update({
        embeds: [
            embed(
                resultTitle,
                `${user}\n\n` +
                `قرارك الأخير: **${action}**\n\n` +
                `🃏 أوراقك: **${playerCards.join(' + ')}** = \`${playerTotal}\`\n` +
                `🎴 أوراق الديلر: **${dealerCards.join(' + ')}** = \`${dealerTotal}\`\n\n` +
                `${resultText}\n\n` +
                `💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n` +
                `⭐ XP: \`+${xp}\`\n` +
                `رصيدك الحالي: \`${player.coins}\` Coins`,
                null,
                color
            )
        ],
        components: mainButtons()
    });
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;

        if (
            !customId.startsWith('game_') &&
            !customId.startsWith('nxg_')
        ) return;

        if (interaction.channel.id !== GAME_CHANNEL_ID) {
            return interaction.reply({
                content: `❌ يمكنك استخدام الألعاب فقط داخل <#${GAME_CHANNEL_ID}>`,
                flags: 64
            });
        }

        const session = gameSessions.getMessageSession(interaction.message.id);

        if (!session) {
            return interaction.reply({
                content: '❌ هذه القائمة قديمة أو غير مرتبطة بجلسة نشطة.',
                flags: 64
            });
        }

        if (session.userId !== interaction.user.id) {
            return interaction.reply({
                content: '❌ هذه القائمة ليست لك. افتح قائمتك الخاصة باستخدام /games.',
                flags: 64
            });
        }

        const user = interaction.user;

        if (customId === 'game_close_menu' || customId === 'nxg_close') {
            gameSessions.clearMessageSession(interaction.message.id);

            return interaction.update({
                embeds: [
                    embed(
                        '✅ تم إغلاق القائمة',
                        `${user} أغلق قائمة الألعاب الخاصة به.`,
                        null,
                        '#FF3B3B'
                    )
                ],
                components: []
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
                ? leaderboard.map((player, index) =>
                    `**#${index + 1}** <@${player.userId}> — 💰 \`${player.coins}\` | ⭐ \`${player.level}\``
                ).join('\n')
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

        if (GAME_COOLDOWNS[customId]) {
            const cooldown = checkCooldown(user.id, customId);

            if (cooldown.active) {
                return interaction.reply({
                    embeds: [
                        embed(
                            '⏳ NEXUS Cooldown',
                            `${user} انتظر قبل لعب نفس اللعبة مرة ثانية.\n\n⏱️ المتبقي: \`${cooldown.remaining}\` ثانية`,
                            null,
                            '#FF3B3B'
                        )
                    ],
                    flags: 64
                });
            }
        }

        if (customId === 'game_dice') {
            return updateGame(
                interaction,
                '🎲 NEXUS Dice',
                `${user}\n\nاختر رقم من **1 إلى 6**.\nإذا طلع نفس رقم النرد تربح جائزة قوية.`,
                [
                    row([1, 2, 3].map(n => btn(`nxg_dice_${n}`, String(n), '🎲'))),
                    row([4, 5, 6].map(n => btn(`nxg_dice_${n}`, String(n), '🎲'))),
                    row([closeButton()])
                ],
                'https://images.unsplash.com/photo-1606167668584-78701c57f13d'
            );
        }

        if (customId.startsWith('nxg_dice_')) {
            const pick = Number(customId.split('_')[2]);
            const roll = random(1, 6);
            const win = pick === roll;

            const coins = win ? 80 : -15;
            const xp = win ? 35 : 8;

            const player = reward(user, { coins, xp, win, loss: !win });

            return interaction.update({
                embeds: [
                    embed(
                        win ? '✅ ربحت | Dice' : '❌ خسرت | Dice',
                        `${user}\n\nاختيارك: **${pick}**\nالنرد طلع: **${roll}**\n\n${win ? '🔥 ضربة معلم!' : 'يا ساتر، النرد خانك.'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        null,
                        win ? '#00FF88' : '#FF3333'
                    )
                ],
                components: mainButtons()
            });
        }

        if (customId === 'game_coinflip') {
            return updateGame(
                interaction,
                '🪙 NEXUS Coinflip',
                `${user}\n\nاختر وجه العملة. لا تلوم الحظ إذا قلب عليك.`,
                [
                    row([
                        btn('nxg_coin_heads', 'Heads', '👑'),
                        btn('nxg_coin_tails', 'Tails', '🪙')
                    ]),
                    row([closeButton()])
                ],
                'https://images.unsplash.com/photo-1621416894569-0f39ed31d247'
            );
        }

        if (customId.startsWith('nxg_coin_')) {
            const pick = customId.split('_')[2];
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const win = pick === result;

            const coins = win ? 40 : -10;
            const xp = win ? 20 : 6;

            const player = reward(user, { coins, xp, win, loss: !win });

            return interaction.update({
                embeds: [
                    embed(
                        win ? '✅ ربحت | Coinflip' : '❌ خسرت | Coinflip',
                        `${user}\n\nاختيارك: **${pick}**\nالنتيجة: **${result}**\n\n${win ? 'عملة محترمة، وقفت معك.' : 'العملة قالت لك: جرّب غيرها.'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        null,
                        win ? '#00FF88' : '#FF3333'
                    )
                ],
                components: mainButtons()
            });
        }

        if (customId === 'game_slots') {
            return updateGame(
                interaction,
                '🎰 NEXUS Slots',
                `${user}\n\nاضغط **Spin** وخلي الحظ يتكلم.`,
                [
                    row([btn('nxg_slots_spin', 'Spin', '🎰', ButtonStyle.Success)]),
                    row([closeButton()])
                ],
                'https://images.unsplash.com/photo-1596838132731-3301c3fd4317'
            );
        }

        if (customId === 'nxg_slots_spin') {
            const icons = ['🍒', '🍋', '💎', '7️⃣', '⭐'];
            const slots = [randomItem(icons), randomItem(icons), randomItem(icons)];

            const jackpot = slots[0] === slots[1] && slots[1] === slots[2];
            const smallWin = slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2];
            const win = jackpot || smallWin;

            const coins = jackpot ? 180 : smallWin ? 55 : -20;
            const xp = jackpot ? 70 : smallWin ? 30 : 10;

            const player = reward(user, { coins, xp, win, loss: !win });

            return interaction.update({
                embeds: [
                    embed(
                        jackpot ? '💎 JACKPOT | Slots' : win ? '✅ ربحت | Slots' : '❌ خسرت | Slots',
                        `${user}\n\n${slots.join(' │ ')}\n\n${jackpot ? '💎 يا وحش! Jackpot!' : win ? 'فوز جميل، لا تطمع كثير.' : 'الماكينة أكلت الكوينز.'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        null,
                        win ? '#00FF88' : '#FF3333'
                    )
                ],
                components: mainButtons()
            });
        }

        if (customId === 'game_guess') {
            const target = random(1, 5);

            return updateGame(
                interaction,
                '🔢 NEXUS Guess Number',
                `${user}\n\nاختر رقم من **1 إلى 5**.`,
                [
                    row([1, 2, 3, 4, 5].map(n => btn(`nxg_guess_${target}_${n}`, String(n), '🔢'))),
                    row([closeButton()])
                ],
                'https://images.unsplash.com/photo-1509228468518-180dd4864904'
            );
        }

        if (customId.startsWith('nxg_guess_')) {
            const parts = customId.split('_');
            const target = Number(parts[2]);
            const pick = Number(parts[3]);
            const win = target === pick;

            const coins = win ? 90 : -20;
            const xp = win ? 40 : 10;

            const player = reward(user, { coins, xp, win, loss: !win });

            return interaction.update({
                embeds: [
                    embed(
                        win ? '✅ ربحت | Guess Number' : '❌ خسرت | Guess Number',
                        `${user}\n\nاختيارك: **${pick}**\nالرقم الصحيح: **${target}**\n\n${win ? 'قراءة عقلية؟ ممتاز.' : 'قريب؟ يمكن. فائز؟ لا.'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        null,
                        win ? '#00FF88' : '#FF3333'
                    )
                ],
                components: mainButtons()
            });
        }

        if (customId === 'game_quiz') {
            const question = randomItem(gameQuestions.quiz);
            const correctIndex = question.correct;

            return updateGame(
                interaction,
                '🧠 NEXUS Quiz',
                `${user}\n\n${question.question}\n\nA) ${question.answers[0]}\nB) ${question.answers[1]}\nC) ${question.answers[2]}\nD) ${question.answers[3]}`,
                [
                    row([
                        btn(`nxg_quiz_${correctIndex}_0`, 'A'),
                        btn(`nxg_quiz_${correctIndex}_1`, 'B'),
                        btn(`nxg_quiz_${correctIndex}_2`, 'C'),
                        btn(`nxg_quiz_${correctIndex}_3`, 'D')
                    ]),
                    row([closeButton()])
                ],
                'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b'
            );
        }

        if (customId.startsWith('nxg_quiz_')) {
            const parts = customId.split('_');
            const correct = Number(parts[2]);
            const chosen = Number(parts[3]);
            const win = chosen === correct;

            const coins = win ? 70 : -15;
            const xp = win ? 35 : 10;

            const player = reward(user, { coins, xp, win, loss: !win });

            return interaction.update({
                embeds: [
                    embed(
                        win ? '✅ إجابة صحيحة | Quiz' : '❌ إجابة خاطئة | Quiz',
                        `${user}\n\n${win ? 'عقلك شغال اليوم.' : 'المعلومة هربت منك.'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        null,
                        win ? '#00FF88' : '#FF3333'
                    )
                ],
                components: mainButtons()
            });
        }

        if (customId === 'game_truth') {
            return updateGame(
                interaction,
                '❓ NEXUS Truth / Dare',
                `${user}\n\nاختر Truth أو Dare. المكافأة بعد الاختيار فقط.`,
                [
                    row([
                        btn('nxg_truth_pick', 'Truth', '❓'),
                        btn('nxg_dare_pick', 'Dare', '🔥')
                    ]),
                    row([closeButton()])
                ],
                'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7'
            );
        }

        if (customId === 'nxg_truth_pick' || customId === 'nxg_dare_pick') {
            const challenge = randomItem(gameQuestions.truthDare);
            const coins = 15;
            const xp = 12;

            const player = reward(user, { coins, xp, win: true, loss: false });

            return interaction.update({
                embeds: [
                    embed(
                        customId === 'nxg_truth_pick' ? '❓ Truth' : '🔥 Dare',
                        `${user}\n\n${challenge}\n\n💰 Coins: \`+${coins}\`\n⭐ XP: \`+${xp}\`\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        null,
                        '#00FF88'
                    )
                ],
                components: mainButtons()
            });
        }

        if (customId === 'game_wyr') {
            const pair = randomItem(gameQuestions.wouldYouRather);

            return updateGame(
                interaction,
                '🤔 NEXUS Would You Rather',
                `${user}\n\nA) **${pair[0]}**\n\nB) **${pair[1]}**\n\nاختر جوابك.`,
                [
                    row([
                        btn('nxg_wyr_A', 'A'),
                        btn('nxg_wyr_B', 'B')
                    ]),
                    row([closeButton()])
                ],
                'https://images.unsplash.com/photo-1493612276216-ee3925520721'
            );
        }

        if (customId === 'nxg_wyr_A' || customId === 'nxg_wyr_B') {
            const answer = customId.split('_')[2];
            const coins = 10;
            const xp = 5;

            const player = reward(user, { coins, xp, win: true, loss: false });

            return interaction.update({
                embeds: [
                    embed(
                        '✅ Would You Rather',
                        `${user}\n\nتم تسجيل جوابك: **${answer}**\n\nالبوت يقول: اختيار جريء... أو غريب شوي.\n\n💰 Coins: \`+${coins}\`\n⭐ XP: \`+${xp}\`\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        null,
                        '#00FF88'
                    )
                ],
                components: mainButtons()
            });
        }

        if (customId === 'game_roulette') {
            return updateGame(
                interaction,
                '🎯 NEXUS Roulette',
                `${user}\n\nاختر لون أو رقم. الروليت ما ترحم.`,
                [
                    row([
                        btn('nxg_roulette_red', 'Red', '🔴', ButtonStyle.Danger),
                        btn('nxg_roulette_black', 'Black', '⚫'),
                        btn('nxg_roulette_green', 'Green', '🟢', ButtonStyle.Success)
                    ]),
                    row([
                        btn('nxg_roulette_1', '1'),
                        btn('nxg_roulette_2', '2'),
                        btn('nxg_roulette_3', '3')
                    ]),
                    row([closeButton()])
                ],
                'https://images.unsplash.com/photo-1606167668584-78701c57f13d'
            );
        }

        if (customId.startsWith('nxg_roulette_')) {
            const pick = customId.replace('nxg_roulette_', '');
            const resultColor = randomItem(['red', 'black', 'green']);
            const resultNumber = String(random(1, 3));
            const win = pick === resultColor || pick === resultNumber;

            const coins = win ? 65 : -30;
            const xp = win ? 30 : 10;

            const player = reward(user, { coins, xp, win, loss: !win });

            return interaction.update({
                embeds: [
                    embed(
                        win ? '✅ ربحت | Roulette' : '❌ خسرت | Roulette',
                        `${user}\n\nاختيارك: **${pick}**\nالنتيجة: **${resultColor} ${resultNumber}**\n\n${win ? 'الروليت صارت تحبك.' : 'الدولاب لف عليك.'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        null,
                        win ? '#00FF88' : '#FF3333'
                    )
                ],
                components: mainButtons()
            });
        }

        if (customId === 'game_mines') {
            const bombs = createBombs();
            const opened = [];

            return updateGame(
                interaction,
                '💣 NEXUS Mines V2',
                `${user}\n\n` +
                `اختر خانة وابتعد عن القنابل.\n\n` +
                `💣 عدد القنابل: \`2\`\n` +
                `💎 الخانات الآمنة المفتوحة: \`0\`\n` +
                `💰 الربح الحالي: \`0 Coins\`\n\n` +
                `كل خانة آمنة تزيد الربح.\nاضغط **Cashout** قبل ما تنفجر.`,
                minesGrid({ bombs, opened }),
                null,
                '#D4AF37'
            );
        }

        if (customId.startsWith('nxg_mines_pick_')) {
            const parts = customId.split('_');

            const bombs = parts[3].split('-').map(Number);
            const opened = parts[4] === 'none'
                ? []
                : parts[4].split('-').map(Number);

            const pick = Number(parts[5]);

            if (opened.includes(pick)) {
                return interaction.reply({
                    content: '❌ هذه الخانة مفتوحة بالفعل.',
                    flags: 64
                });
            }

            const isBomb = bombs.includes(pick);

            if (isBomb) {
                const coins = -40;
                const xp = 12;

                const player = reward(user, {
                    coins,
                    xp,
                    win: false,
                    loss: true
                });

                return interaction.update({
                    embeds: [
                        embed(
                            '💥 انفجر اللغم | Mines',
                            `${user}\n\n` +
                            `اخترت الخانة: **${pick}**\n` +
                            `وكانت قنبلة 💣\n\n` +
                            `💰 Coins: \`${coins}\`\n` +
                            `⭐ XP: \`+${xp}\`\n` +
                            `رصيدك الحالي: \`${player.coins}\` Coins\n\n` +
                            `يا ساتر... كنت قريب من الكاش آوت.`,
                            null,
                            '#FF3333'
                        )
                    ],
                    components: mainButtons()
                });
            }

            const newOpened = [...opened, pick];
            const currentReward = minesMultiplier(newOpened.length);

            if (newOpened.length >= 7) {
                const coins = currentReward + 150;
                const xp = 80;

                const player = reward(user, {
                    coins,
                    xp,
                    win: true,
                    loss: false
                });

                return interaction.update({
                    embeds: [
                        embed(
                            '💎 PERFECT CLEAR | Mines',
                            `${user}\n\n` +
                            `فتحت كل الخانات الآمنة بدون ما تنفجر!\n\n` +
                            `💰 Coins: \`+${coins}\`\n` +
                            `⭐ XP: \`+${xp}\`\n` +
                            `رصيدك الحالي: \`${player.coins}\` Coins\n\n` +
                            `هذا لعب نظيف جدًا 🔥`,
                            null,
                            '#00FF88'
                        )
                    ],
                    components: mainButtons()
                });
            }

            return interaction.update({
                embeds: [
                    embed(
                        '💣 NEXUS Mines V2',
                        `${user}\n\n` +
                        `✅ الخانة **${pick}** آمنة!\n\n` +
                        `💣 عدد القنابل: \`2\`\n` +
                        `💎 الخانات الآمنة المفتوحة: \`${newOpened.length}\`\n` +
                        `💰 الربح الحالي: \`${currentReward} Coins\`\n\n` +
                        `تقدر تكمل وتخاطر... أو تضغط **Cashout** وتسحب ربحك.`,
                        null,
                        '#D4AF37'
                    )
                ],
                components: minesGrid({ bombs, opened: newOpened })
            });
        }

        if (customId.startsWith('nxg_mines_cashout_')) {
            const parts = customId.split('_');

            const opened = parts[4] === 'none'
                ? []
                : parts[4].split('-').map(Number);

            if (!opened.length) {
                return interaction.reply({
                    content: '❌ لازم تفتح خانة آمنة واحدة على الأقل قبل Cashout.',
                    flags: 64
                });
            }

            const coins = minesMultiplier(opened.length);
            const xp = 15 + opened.length * 8;

            const player = reward(user, {
                coins,
                xp,
                win: true,
                loss: false
            });

            return interaction.update({
                embeds: [
                    embed(
                        '💰 Cashout ناجح | Mines',
                        `${user}\n\n` +
                        `سحبت أرباحك بنجاح قبل الانفجار.\n\n` +
                        `💎 الخانات الآمنة: \`${opened.length}\`\n` +
                        `💰 Coins: \`+${coins}\`\n` +
                        `⭐ XP: \`+${xp}\`\n` +
                        `رصيدك الحالي: \`${player.coins}\` Coins\n\n` +
                        `قرار ذكي... بس كنت تقدر تطمع أكثر 😈`,
                        null,
                        '#00FF88'
                    )
                ],
                components: mainButtons()
            });
        }

        if (customId === 'game_blackjack') {
            const playerCards = [drawCard(), drawCard()];
            const dealerCards = [drawCard(), drawCard()];
            const playerTotal = cardsTotal(playerCards);

            return updateGame(
                interaction,
                '🃏 NEXUS Blackjack V2',
                `${user}\n\n` +
                `🃏 أوراقك: **${playerCards.join(' + ')}** = \`${playerTotal}\`\n` +
                `🎴 ورقة الديلر الظاهرة: **${dealerCards[0]}**\n\n` +
                `اختر:\n` +
                `➕ **Hit** لسحب ورقة إضافية\n` +
                `🛑 **Stand** لإنهاء دورك وكشف الديلر`,
                blackjackRows(playerCards, dealerCards),
                'https://images.unsplash.com/photo-1511193311914-0346f16efe90',
                '#D4AF37'
            );
        }

        if (customId.startsWith('nxg_blackjack_')) {
            const parts = customId.split('_');
            const action = parts[2];
            const playerCards = parts[3].split('-').map(Number);
            const dealerCards = parts[4].split('-').map(Number);

            if (action === 'hit') {
                playerCards.push(drawCard());
                const playerTotal = cardsTotal(playerCards);

                if (playerTotal > 21) {
                    return finishBlackjack(user, interaction, playerCards, dealerCards, 'Hit');
                }

                if (playerTotal === 21) {
                    return finishBlackjack(user, interaction, playerCards, dealerCards, 'Hit');
                }

                return interaction.update({
                    embeds: [
                        embed(
                            '🃏 NEXUS Blackjack V2',
                            `${user}\n\n` +
                            `سحبت ورقة جديدة.\n\n` +
                            `🃏 أوراقك: **${playerCards.join(' + ')}** = \`${playerTotal}\`\n` +
                            `🎴 ورقة الديلر الظاهرة: **${dealerCards[0]}**\n\n` +
                            `تكمل Hit؟ ولا توقف Stand؟`,
                            'https://images.unsplash.com/photo-1511193311914-0346f16efe90',
                            '#D4AF37'
                        )
                    ],
                    components: blackjackRows(playerCards, dealerCards)
                });
            }

            if (action === 'stand') {
                return finishBlackjack(user, interaction, playerCards, dealerCards, 'Stand');
            }
        }

        if (customId === 'game_fasttype') {
            const word = randomItem(gameQuestions.fastWords);

            await interaction.update({
                embeds: [
                    embed(
                        '⚡ NEXUS Fast Type',
                        `${user}\n\nاكتب الكلمة التالية:\n\n**${word}**\n\nعندك دقيقة قبل الإقصاء.`,
                        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4'
                    )
                ],
                components: [row([closeButton()])]
            });

            const filter = msg =>
                msg.author.id === user.id &&
                msg.channel.id === interaction.channel.id;

            const collector = interaction.channel.createMessageCollector({
                filter,
                time: 60000,
                max: 1
            });

            collector.on('collect', msg => {
                const correct = msg.content.trim() === word;

                const coins = correct ? 75 : -15;
                const xp = correct ? 35 : 8;

                const player = reward(user, {
                    coins,
                    xp,
                    win: correct,
                    loss: !correct
                });

                return interaction.followUp({
                    embeds: [
                        embed(
                            correct ? '✅ صحيح | Fast Type' : '❌ خطأ | Fast Type',
                            `${user}\n\nالمطلوب: **${word}**\nكتابتك: **${msg.content}**\n\n${correct ? 'يدك أسرع من تفكيرك.' : 'الحروف زعلت منك.'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\nرصيدك الحالي: \`${player.coins}\` Coins`,
                            null,
                            correct ? '#00FF88' : '#FF3333'
                        )
                    ]
                });
            });

            collector.on('end', collected => {
                if (collected.size > 0) return;

                reward(user, {
                    coins: -10,
                    xp: 5,
                    win: false,
                    loss: true
                });

                return interaction.followUp({
                    embeds: [
                        embed(
                            '⏰ تم إقصاؤك | Fast Type',
                            `${user}\n\nلم تتفاعل خلال دقيقة، تم احتساب خسارة بسيطة.`,
                            null,
                            '#FF3333'
                        )
                    ]
                });
            });
        }
    }
};