const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const gameSessions = require('../utils/gameSessions');

function gameButtons() {
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
                .setCustomId('game_blackjack')
                .setLabel('Blackjack')
                .setEmoji('🃏')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('game_guess')
                .setLabel('Guess')
                .setEmoji('🔢')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('game_quiz')
                .setLabel('Quiz')
                .setEmoji('🧠')
                .setStyle(ButtonStyle.Success)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('game_truth')
                .setLabel('Truth/Dare')
                .setEmoji('❓')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('game_wyr')
                .setLabel('Would You Rather')
                .setEmoji('🤔')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('game_roulette')
                .setLabel('Roulette')
                .setEmoji('🎯')
                .setStyle(ButtonStyle.Danger)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('game_mines')
                .setLabel('Mines')
                .setEmoji('💣')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId('game_fasttype')
                .setLabel('Fast Type')
                .setEmoji('⚡')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('mafia_create')
                .setLabel('Mafia')
                .setEmoji('🕵️')
                .setStyle(ButtonStyle.Danger)
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
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('game_close_menu')
                .setLabel('إغلاق')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        )
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('فتح قائمة ألعاب NEXUS'),

    async execute(interaction) {

        const existingSession =
            await gameSessions.getUserSession(interaction.user.id);

        if (existingSession) {
            await gameSessions.clearUserSession(interaction.user.id);
        }

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle('🎮 NEXUS Games Hub')
            .setDescription(
                `${interaction.user}\n\n` +
                `اختر لعبة وابدأ التحدي.\n\n` +
                `💰 اربح Coins\n` +
                `⭐ اجمع XP\n` +
                `🏆 ارفع مستواك`
            )
            .setFooter({
                text: 'NEXUS COMMUNITY • Interactive Games'
            })
            .setTimestamp();

        const msg = await interaction.reply({
            embeds: [embed],
            components: gameButtons(),
            fetchReply: true
        });

        await gameSessions.createSession({
            userId: interaction.user.id,
            channelId: interaction.channel.id,
            messageId: msg.id,
            type: 'games'
        });
    }
};