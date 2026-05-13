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
const recentPicks = new Map();

const GAME_COOLDOWNS = {
    game_dice: 30 * 1000,
    game_coinflip: 30 * 1000,
    game_slots: 45 * 1000,
    game_blackjack: 60 * 1000,
    game_guess: 45 * 1000,
    game_quiz: 45 * 1000
};

function getRecentKey(channelId, type) {
    return `${channelId}:${type}`;
}

function pickUnique(channelId, type, items, memorySize = 5) {
    const key = getRecentKey(channelId, type);
    const recent = recentPicks.get(key) || [];

    let available = items
        .map((item, index) => ({ item, index }))
        .filter(entry => !recent.includes(entry.index));

    if (!available.length) {
        available = items.map((item, index) => ({ item, index }));
        recentPicks.set(key, []);
    }

    const selected = available[Math.floor(Math.random() * available.length)];

    const updatedRecent = [
        selected.index,
        ...(recentPicks.get(key) || [])
    ].slice(0, memorySize);

    recentPicks.set(key, updatedRecent);

    return {
        item: selected.item,
        index: selected.index
    };
}

function checkCooldown(userId, gameId) {
    const key = `${userId}:${gameId}`;
    const cooldownTime = GAME_COOLDOWNS[gameId];

    if (!cooldownTime) {
        return { active: false, remaining: 0 };
    }

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

function nextGameButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('game_dice').setLabel('Dice').setEmoji('🎲').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_coinflip').setLabel('Coinflip').setEmoji('🪙').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_slots').setLabel('Slots').setEmoji('🎰').setStyle(ButtonStyle.Success)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('game_blackjack').setLabel('Blackjack').setEmoji('🃏').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_guess').setLabel('Guess Number').setEmoji('🔢').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_quiz').setLabel('Quiz').setEmoji('🧠').setStyle(ButtonStyle.Success)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('game_profile').setLabel('Profile').setEmoji('👤').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('game_leaderboard').setLabel('Leaderboard').setEmoji('🏆').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function resultEmbed({ title, description, image, color = '#D4AF37', user }) {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setImage(image)
        .setFooter({
            text: `NEXUS Game System • ${user.tag}`
        })
        .setTimestamp();
}

function cardValue() {
    return Math.floor(Math.random() * 10) + 2;
}

function guessButtons(target, max) {
    const buttons = [];

    for (let i = 1; i <= max; i++) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`game_guess_answer_${target}_${i}`)
                .setLabel(String(i))
                .setStyle(ButtonStyle.Secondary)
        );
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return rows;
}

function quizButtons(questionIndex) {
    const question = gameQuestions.quiz[questionIndex];

    return [
        new ActionRowBuilder().addComponents(
            question.answers.map((answer, index) =>
                new ButtonBuilder()
                    .setCustomId(`game_quiz_answer_${questionIndex}_${index}`)
                    .setLabel(answer)
                    .setStyle(ButtonStyle.Secondary)
            )
        )
    ];
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
        const activeSession = gameSessions.getSession(interaction.channel.id);

        if (activeSession && activeSession.userId !== user.id) {
            return interaction.reply({
                content: `⏳ يوجد لعبة أو قائمة مفتوحة حاليًا بواسطة <@${activeSession.userId}>.\nانتظر حتى تنتهي اللعبة الحالية.`,
                flags: 64
            });
        }

        if (!activeSession && interaction.customId !== 'game_profile' && interaction.customId !== 'game_leaderboard') {
            gameSessions.setSession(interaction.channel.id, {
                userId: user.id,
                type: interaction.customId,
                duration: 120000
            });
        }

        if (GAME_COOLDOWNS[interaction.customId]) {
            const cooldown = checkCooldown(user.id, interaction.customId);

            if (cooldown.active) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF3B3B')
                            .setTitle('⏳ NEXUS Cooldown System')
                            .setDescription(
                                `${user} انتظر شوي قبل ما تلعب نفس اللعبة مرة ثانية.\n\n` +
                                `⏱️ الوقت المتبقي: \`${cooldown.remaining}\` ثانية`
                            )
                            .setFooter({ text: 'NEXUS COMMUNITY • Anti Spam Protection' })
                            .setTimestamp()
                    ],
                    flags: 64
                });
            }
        }

        if (interaction.customId === 'game_dice') {
            const roll = Math.floor(Math.random() * 6) + 1;
            const win = roll >= 4;
            const coins = win ? 35 : -15;
            const xp = win ? 20 : 8;

            const player = gameDB.addReward(user, { coins, xp, win, loss: !win });
            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    resultEmbed({
                        title: '🎲 NEXUS Dice Game',
                        description:
                            `${user} رمى النرد وطلع الرقم: **${roll}**\n\n` +
                            `${win ? '🔥 فزت!' : '💀 خسرت!'}\n` +
                            `💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n` +
                            `⭐ XP: \`+${xp}\`\n\n` +
                            `رصيدك الحالي: \`${player.coins}\` Coins`,
                        image: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d',
                        color: win ? '#D4AF37' : '#FF3B3B',
                        user
                    })
                ],
                components: nextGameButtons()
            });
        }

        if (interaction.customId === 'game_coinflip') {
            const result = randomItem(['Heads', 'Tails']);
            const win = result === 'Heads';
            const coins = win ? 25 : -10;
            const xp = win ? 15 : 6;

            const player = gameDB.addReward(user, { coins, xp, win, loss: !win });
            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    resultEmbed({
                        title: '🪙 NEXUS Coinflip',
                        description:
                            `${user} قلب العملة...\n\n` +
                            `🪙 النتيجة: **${result}**\n\n` +
                            `${win ? '🔥 فزت!' : '💀 خسرت!'}\n` +
                            `💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n` +
                            `⭐ XP: \`+${xp}\`\n\n` +
                            `رصيدك الحالي: \`${player.coins}\` Coins`,
                        image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247',
                        color: win ? '#D4AF37' : '#FF3B3B',
                        user
                    })
                ],
                components: nextGameButtons()
            });
        }

        if (interaction.customId === 'game_slots') {
            const icons = ['🍒', '🍋', '💎', '7️⃣', '⭐'];
            const slot1 = randomItem(icons);
            const slot2 = randomItem(icons);
            const slot3 = randomItem(icons);

            const jackpot = slot1 === slot2 && slot2 === slot3;
            const smallWin = slot1 === slot2 || slot2 === slot3 || slot1 === slot3;
            const win = jackpot || smallWin;

            const coins = jackpot ? 150 : smallWin ? 45 : -20;
            const xp = jackpot ? 60 : smallWin ? 25 : 10;

            const player = gameDB.addReward(user, { coins, xp, win, loss: !win });
            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    resultEmbed({
                        title: '🎰 NEXUS Slots',
                        description:
                            `${user} سحب ماكينة الحظ...\n\n` +
                            `╔══════════╗\n` +
                            `║ ${slot1} │ ${slot2} │ ${slot3} ║\n` +
                            `╚══════════╝\n\n` +
                            `${jackpot ? '💎 JACKPOT أسطوري!' : win ? '🔥 فوز جميل!' : '💀 خسرت الجولة!'}\n` +
                            `💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n` +
                            `⭐ XP: \`+${xp}\`\n\n` +
                            `رصيدك الحالي: \`${player.coins}\` Coins`,
                        image: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317',
                        color: win ? '#D4AF37' : '#FF3B3B',
                        user
                    })
                ],
                components: nextGameButtons()
            });
        }

        if (interaction.customId === 'game_blackjack') {
            const playerCard1 = cardValue();
            const playerCard2 = cardValue();
            const dealerCard1 = cardValue();
            const dealerCard2 = cardValue();

            const playerTotal = playerCard1 + playerCard2;
            const dealerTotal = dealerCard1 + dealerCard2;

            const win = playerTotal > dealerTotal && playerTotal <= 21;
            const draw = playerTotal === dealerTotal;

            const coins = draw ? 5 : win ? 60 : -25;
            const xp = draw ? 12 : win ? 35 : 10;

            const player = gameDB.addReward(user, { coins, xp, win, loss: !win && !draw });
            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    resultEmbed({
                        title: '🃏 NEXUS Blackjack',
                        description:
                            `${user} دخل طاولة البلاك جاك...\n\n` +
                            `🃏 أوراقك: \`${playerCard1}\` + \`${playerCard2}\` = **${playerTotal}**\n` +
                            `🏦 الديلر: \`${dealerCard1}\` + \`${dealerCard2}\` = **${dealerTotal}**\n\n` +
                            `${draw ? '⚖️ تعادل!' : win ? '🔥 فزت على الديلر!' : '💀 الديلر فاز عليك!'}\n` +
                            `💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n` +
                            `⭐ XP: \`+${xp}\`\n\n` +
                            `رصيدك الحالي: \`${player.coins}\` Coins`,
                        image: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90',
                        color: win ? '#D4AF37' : draw ? '#3498DB' : '#FF3B3B',
                        user
                    })
                ],
                components: nextGameButtons()
            });
        }

        if (interaction.customId === 'game_guess') {
            const picked = pickUnique(interaction.channel.id, 'guessRange', gameQuestions.guessRanges, 3);
            const range = picked.item;
            const target = Math.floor(Math.random() * range.max) + range.min;

            gameSessions.setSession(interaction.channel.id, {
                userId: user.id,
                type: 'guess',
                target,
                duration: 60000
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#D4AF37')
                        .setTitle('🔢 NEXUS Guess Number')
                        .setDescription(
                            `${user}\n\n` +
                            `اختر رقم من **${range.min} إلى ${range.max}**.\n` +
                            `إذا اخترت الرقم الصحيح تربح **${range.reward} Coins**.`
                        )
                        .setImage('https://images.unsplash.com/photo-1509228468518-180dd4864904')
                        .setFooter({ text: 'NEXUS COMMUNITY • Guess Game' })
                        .setTimestamp()
                ],
                components: guessButtons(target, range.max)
            });
        }

        if (interaction.customId.startsWith('game_guess_answer_')) {
            const parts = interaction.customId.split('_');
            const target = Number(parts[3]);
            const chosen = Number(parts[4]);

            const win = target === chosen;
            const coins = win ? 90 : -20;
            const xp = win ? 40 : 10;

            const player = gameDB.addReward(user, { coins, xp, win, loss: !win });
            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    resultEmbed({
                        title: '🔢 NEXUS Guess Result',
                        description:
                            `${user}\n\n` +
                            `🎯 الرقم الصحيح: **${target}**\n` +
                            `👉 اختيارك: **${chosen}**\n\n` +
                            `${win ? '🔥 إجابة صحيحة!' : '💀 إجابة خاطئة!'}\n` +
                            `💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n` +
                            `⭐ XP: \`+${xp}\`\n\n` +
                            `رصيدك الحالي: \`${player.coins}\` Coins`,
                        image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904',
                        color: win ? '#D4AF37' : '#FF3B3B',
                        user
                    })
                ],
                components: nextGameButtons()
            });
        }

        if (interaction.customId === 'game_quiz') {
            const picked = pickUnique(interaction.channel.id, 'quiz', gameQuestions.quiz, 8);
            const questionIndex = picked.index;
            const question = picked.item;

            gameSessions.setSession(interaction.channel.id, {
                userId: user.id,
                type: 'quiz',
                questionIndex,
                duration: 60000
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#D4AF37')
                        .setTitle('🧠 NEXUS Quiz')
                        .setDescription(
                            `${user}\n\n` +
                            `**${question.question}**\n\n` +
                            `اختر الإجابة الصحيحة من الأزرار.`
                        )
                        .setImage('https://images.unsplash.com/photo-1606326608606-aa0b62935f2b')
                        .setFooter({ text: 'NEXUS COMMUNITY • Quiz Game' })
                        .setTimestamp()
                ],
                components: quizButtons(questionIndex)
            });
        }

        if (interaction.customId.startsWith('game_quiz_answer_')) {
            const parts = interaction.customId.split('_');
            const questionIndex = Number(parts[3]);
            const chosen = Number(parts[4]);

            const question = gameQuestions.quiz[questionIndex];
            const win = chosen === question.correct;

            const coins = win ? 70 : -15;
            const xp = win ? 35 : 10;

            const player = gameDB.addReward(user, { coins, xp, win, loss: !win });
            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    resultEmbed({
                        title: '🧠 NEXUS Quiz Result',
                        description:
                            `${user}\n\n` +
                            `❓ السؤال: **${question.question}**\n` +
                            `✅ الإجابة الصحيحة: **${question.answers[question.correct]}**\n` +
                            `👉 إجابتك: **${question.answers[chosen]}**\n\n` +
                            `${win ? '🔥 إجابة صحيحة!' : '💀 إجابة خاطئة!'}\n` +
                            `💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n` +
                            `⭐ XP: \`+${xp}\`\n\n` +
                            `رصيدك الحالي: \`${player.coins}\` Coins`,
                        image: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b',
                        color: win ? '#D4AF37' : '#FF3B3B',
                        user
                    })
                ],
                components: nextGameButtons()
            });
        }

        if (interaction.customId === 'game_profile') {
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
                        .setImage('https://images.unsplash.com/photo-1511882150382-421056c89033')
                        .setFooter({ text: 'NEXUS COMMUNITY • Player Stats' })
                        .setTimestamp()
                ],
                components: nextGameButtons(),
                flags: 64
            });
        }

        if (interaction.customId === 'game_leaderboard') {
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
                        .setImage('https://images.unsplash.com/photo-1560253023-3ec5d502959f')
                        .setFooter({ text: 'NEXUS COMMUNITY • Top Players' })
                        .setTimestamp()
                ],
                components: nextGameButtons()
            });
        }
    }
};