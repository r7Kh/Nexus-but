const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const gameDB = require('../utils/gameDB');

const GAME_CHANNEL_ID = '1429135776289132544';

function nextGameButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('game_dice')
                .setLabel('Dice')
                .setEmoji('🎲')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('game_coinflip')
                .setLabel('Coinflip')
                .setEmoji('🪙')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('game_slots')
                .setLabel('Slots')
                .setEmoji('🎰')
                .setStyle(ButtonStyle.Success)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('game_profile')
                .setLabel('Profile')
                .setEmoji('👤')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('game_leaderboard')
                .setLabel('Leaderboard')
                .setEmoji('🏆')
                .setStyle(ButtonStyle.Secondary)
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

        if (interaction.customId === 'game_dice') {
            const roll = Math.floor(Math.random() * 6) + 1;

            const win = roll >= 4;
            const coins = win ? 35 : -15;
            const xp = win ? 20 : 8;

            const player = gameDB.addReward(user, {
                coins,
                xp,
                win,
                loss: !win
            });

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
            const sides = ['Heads', 'Tails'];
            const result = randomItem(sides);
            const win = result === 'Heads';

            const coins = win ? 25 : -10;
            const xp = win ? 15 : 6;

            const player = gameDB.addReward(user, {
                coins,
                xp,
                win,
                loss: !win
            });

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

            const player = gameDB.addReward(user, {
                coins,
                xp,
                win,
                loss: !win
            });

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