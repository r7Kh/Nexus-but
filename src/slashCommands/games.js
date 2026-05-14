const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const gameDB = require('../utils/gameDB');
const gameSessions = require('../utils/gameSessions');

const GAME_CHANNEL_ID = '1429135776289132544';

function btn(id, label, emoji, style = ButtonStyle.Primary) {
    const button = new ButtonBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style);

    if (emoji) button.setEmoji(emoji);

    return button;
}

function row(buttons) {
    return new ActionRowBuilder().addComponents(buttons);
}

function gameButtons() {
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
            btn('game_close_menu', 'إغلاق', '❌', ButtonStyle.Danger)
        ])
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('فتح مركز ألعاب NEXUS'),

    async execute(interaction, client) {
        if (interaction.channel.id !== GAME_CHANNEL_ID) {
            return interaction.reply({
                content: `❌ يمكنك استخدام نظام الألعاب فقط داخل <#${GAME_CHANNEL_ID}>`,
                flags: 64
            });
        }

        const oldSession = gameSessions.getUserSession(interaction.user.id);

        if (oldSession) {
            try {
                const oldMessage = await interaction.channel.messages.fetch(
                    oldSession.messageId
                );

                if (!oldMessage) {
                    gameSessions.clearUserSession(interaction.user.id);
                } else {
                    return interaction.reply({
                        content: '⏳ عندك قائمة ألعاب مفتوحة بالفعل. أغلقها أولًا قبل فتح قائمة جديدة.',
                        flags: 64
                    });
                }

            } catch {
                gameSessions.clearUserSession(interaction.user.id);
            }
        }

        const player = gameDB.getPlayer(interaction.user);

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle('🎮 NEXUS Game Hub')
            .setDescription(
                `مرحبًا ${interaction.user}\n\n` +
                `اختر لعبتك وادخل التحدي.\n\n` +
                `💰 Coins: \`${player.coins}\`\n` +
                `⭐ Level: \`${player.level}\`\n` +
                `🔥 Streak: \`${player.streak}\`\n\n` +
                `🔒 هذه القائمة خاصة بك فقط.`
            )
            .setImage('https://images.unsplash.com/photo-1511512578047-dfb367046420')
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({
                text: 'NEXUS COMMUNITY • Advanced Game System'
            })
            .setTimestamp();

        const reply = await interaction.reply({
            embeds: [embed],
            components: gameButtons(),
            withResponse: true
        });

        const message = await interaction.fetchReply();

        gameSessions.createSession({
            userId: interaction.user.id,
            channelId: interaction.channel.id,
            messageId: message.id,
            type: 'hub'
        });
    }
};