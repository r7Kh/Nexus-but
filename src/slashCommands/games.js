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

function gameButtons() {
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
            new ButtonBuilder().setCustomId('game_truth').setLabel('Truth/Dare').setEmoji('❓').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_wyr').setLabel('Would You Rather').setEmoji('🤔').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('game_roulette').setLabel('Roulette').setEmoji('🎯').setStyle(ButtonStyle.Danger)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('game_mines').setLabel('Mines').setEmoji('💣').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('game_fasttype').setLabel('Fast Type').setEmoji('⚡').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('mafia_create').setLabel('Mafia').setEmoji('🕵️').setStyle(ButtonStyle.Danger)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('game_profile').setLabel('Profile').setEmoji('👤').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('game_leaderboard').setLabel('Leaderboard').setEmoji('🏆').setStyle(ButtonStyle.Secondary)
        )
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

        const activeSession = gameSessions.getSession(interaction.channel.id);

        if (activeSession) {
            return interaction.reply({
                content: `⏳ يوجد قائمة ألعاب أو لعبة شغالة حاليًا بواسطة <@${activeSession.userId}>.`,
                flags: 64
            });
        }

        gameSessions.setSession(interaction.channel.id, {
            userId: interaction.user.id,
            type: 'hub',
            duration: 120000
        });

        const player = gameDB.getPlayer(interaction.user);

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle('🎮 NEXUS Game Hub')
            .setDescription(
                `مرحبًا ${interaction.user}\n\n` +
                `اختر لعبة من الأزرار بالأسفل.\n\n` +
                `💰 Coins: \`${player.coins}\`\n` +
                `⭐ Level: \`${player.level}\`\n` +
                `🔥 Streak: \`${player.streak}\`\n\n` +
                `🔒 هذه القائمة محجوزة لك لمدة دقيقتين.`
            )
            .setImage('https://images.unsplash.com/photo-1511512578047-dfb367046420')
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: 'NEXUS COMMUNITY • Game System' })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            components: gameButtons()
        });
    }
};