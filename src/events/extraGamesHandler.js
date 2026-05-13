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

const COOLDOWNS = {
    game_truth: 30 * 1000,
    game_wyr: 30 * 1000,
    game_roulette: 45 * 1000,
    game_mines: 60 * 1000,
    game_fasttype: 60 * 1000
};

function checkCooldown(userId, gameId) {
    const key = `${userId}:${gameId}`;
    const now = Date.now();
    const expiresAt = cooldowns.get(key) || 0;
    const cd = COOLDOWNS[gameId];

    if (!cd) return { active: false, remaining: 0 };

    if (now < expiresAt) {
        return {
            active: true,
            remaining: Math.ceil((expiresAt - now) / 1000)
        };
    }

    cooldowns.set(key, now + cd);
    return { active: false, remaining: 0 };
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function nextButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('game_dice').setLabel('Dice').setEmoji('🎲').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_coinflip').setLabel('Coinflip').setEmoji('🪙').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_slots').setLabel('Slots').setEmoji('🎰').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('game_truth').setLabel('Truth/Dare').setEmoji('❓').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_wyr').setLabel('Would You Rather').setEmoji('🤔').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_fasttype').setLabel('Fast Type').setEmoji('⚡').setStyle(ButtonStyle.Success)
        )
    ];
}

function baseEmbed(title, description, image, user, color = '#D4AF37') {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setImage(image)
        .setFooter({ text: `NEXUS Game System • ${user.tag}` })
        .setTimestamp();
}

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;

        const allowed = [
            'game_truth',
            'game_wyr',
            'game_roulette',
            'game_mines',
            'game_fasttype'
        ];

        if (!allowed.includes(interaction.customId)) return;

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
                content: `⏳ يوجد لعبة أو قائمة مفتوحة حاليًا بواسطة <@${activeSession.userId}>.`,
                flags: 64
            });
        }

        const cooldown = checkCooldown(user.id, interaction.customId);

        if (cooldown.active) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF3B3B')
                        .setTitle('⏳ NEXUS Cooldown System')
                        .setDescription(`انتظر \`${cooldown.remaining}\` ثانية قبل لعب هذه اللعبة مرة ثانية.`)
                        .setTimestamp()
                ],
                flags: 64
            });
        }

        gameSessions.setSession(interaction.channel.id, {
            userId: user.id,
            type: interaction.customId,
            duration: 120000
        });

        if (interaction.customId === 'game_truth') {
            const challenge = randomItem(gameQuestions.truthDare);
            const reward = 15;

            const player = gameDB.addReward(user, {
                coins: reward,
                xp: 12,
                win: true,
                loss: false
            });

            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    baseEmbed(
                        '❓ NEXUS Truth / Dare',
                        `${user}\n\n**التحدي:**\n${challenge}\n\n💰 Coins: \`+${reward}\`\n⭐ XP: \`+12\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7',
                        user
                    )
                ],
                components: nextButtons()
            });
        }

        if (interaction.customId === 'game_wyr') {
            const pair = randomItem(gameQuestions.wouldYouRather);

            gameDB.addReward(user, {
                coins: 10,
                xp: 10,
                win: true,
                loss: false
            });

            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    baseEmbed(
                        '🤔 NEXUS Would You Rather',
                        `${user}\n\nتختار أي خيار؟\n\n🅰️ **${pair[0]}**\n\n🅱️ **${pair[1]}**\n\n💰 حصلت على \`+10\` Coins للمشاركة.`,
                        'https://images.unsplash.com/photo-1493612276216-ee3925520721',
                        user
                    )
                ],
                components: nextButtons()
            });
        }

        if (interaction.customId === 'game_roulette') {
            const chamber = Math.floor(Math.random() * 6) + 1;
            const shot = Math.floor(Math.random() * 6) + 1;
            const win = chamber !== shot;

            const coins = win ? 45 : -40;
            const xp = win ? 25 : 12;

            const player = gameDB.addReward(user, {
                coins,
                xp,
                win,
                loss: !win
            });

            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    baseEmbed(
                        '🎯 NEXUS Roulette',
                        `${user}\n\n🎯 رقم الخطر: \`${chamber}\`\n🎲 اختيارك العشوائي: \`${shot}\`\n\n${win ? '🔥 نجوت وربحت!' : '💀 خسرت الجولة!'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1606167668584-78701c57f13d',
                        user,
                        win ? '#D4AF37' : '#FF3B3B'
                    )
                ],
                components: nextButtons()
            });
        }

        if (interaction.customId === 'game_mines') {
            const safe = Math.floor(Math.random() * 9) + 1;
            const picked = Math.floor(Math.random() * 9) + 1;
            const win = safe === picked;

            const coins = win ? 120 : -35;
            const xp = win ? 50 : 15;

            const player = gameDB.addReward(user, {
                coins,
                xp,
                win,
                loss: !win
            });

            gameSessions.clearSession(interaction.channel.id);

            return interaction.reply({
                embeds: [
                    baseEmbed(
                        '💣 NEXUS Mines',
                        `${user}\n\nاخترت خانة عشوائية...\n\n✅ الخانة الآمنة: \`${safe}\`\n👉 خانتك: \`${picked}\`\n\n${win ? '💎 نجوت من الألغام!' : '💥 انفجر اللغم!'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                        'https://images.unsplash.com/photo-1511512578047-dfb367046420',
                        user,
                        win ? '#D4AF37' : '#FF3B3B'
                    )
                ],
                components: nextButtons()
            });
        }

        if (interaction.customId === 'game_fasttype') {
            const word = randomItem(gameQuestions.fastWords);

            await interaction.reply({
                embeds: [
                    baseEmbed(
                        '⚡ NEXUS Fast Type',
                        `${user}\n\nاكتب الجملة التالية خلال **15 ثانية**:\n\n\`${word}\``,
                        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4',
                        user
                    )
                ]
            });

            const filter = msg =>
                msg.author.id === user.id &&
                msg.channel.id === interaction.channel.id;

            const collector = interaction.channel.createMessageCollector({
                filter,
                time: 15000,
                max: 1
            });

            collector.on('collect', msg => {
                const correct = msg.content.trim().toLowerCase() === word.toLowerCase();

                const coins = correct ? 75 : -15;
                const xp = correct ? 35 : 8;

                const player = gameDB.addReward(user, {
                    coins,
                    xp,
                    win: correct,
                    loss: !correct
                });

                gameSessions.clearSession(interaction.channel.id);

                interaction.followUp({
                    embeds: [
                        baseEmbed(
                            '⚡ NEXUS Fast Type Result',
                            `${user}\n\nالجملة المطلوبة:\n\`${word}\`\n\nإجابتك:\n\`${msg.content}\`\n\n${correct ? '🔥 كتابة صحيحة وسريعة!' : '💀 خطأ أو اختلاف بالنص!'}\n\n💰 Coins: \`${coins > 0 ? '+' : ''}${coins}\`\n⭐ XP: \`+${xp}\`\n\nرصيدك الحالي: \`${player.coins}\` Coins`,
                            'https://images.unsplash.com/photo-1515879218367-8466d910aaa4',
                            user,
                            correct ? '#D4AF37' : '#FF3B3B'
                        )
                    ],
                    components: nextButtons()
                });
            });

            collector.on('end', collected => {
                if (collected.size > 0) return;

                gameDB.addReward(user, {
                    coins: -10,
                    xp: 5,
                    win: false,
                    loss: true
                });

                gameSessions.clearSession(interaction.channel.id);

                interaction.followUp({
                    embeds: [
                        baseEmbed(
                            '⏰ NEXUS Fast Type Timeout',
                            `${user}\n\nانتهى الوقت ولم تكتب الجملة.\n\n💰 Coins: \`-10\`\n⭐ XP: \`+5\``,
                            'https://images.unsplash.com/photo-1515879218367-8466d910aaa4',
                            user,
                            '#FF3B3B'
                        )
                    ],
                    components: nextButtons()
                });
            });
        }
    }
};