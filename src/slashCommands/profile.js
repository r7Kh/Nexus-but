const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const gameDB = require('../utils/gameDB');

function progressBar(current, required, size = 10) {
    const percentage = current / required;
    const filled = Math.round(size * percentage);
    const empty = size - filled;

    return '🟩'.repeat(filled) + '⬛'.repeat(empty);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('عرض بروفايل ألعاب NEXUS')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('عرض بروفايل لاعب آخر')
                .setRequired(false)
        ),

    async execute(interaction) {
        const target =
            interaction.options.getUser('user') ||
            interaction.user;

        const player = gameDB.getPlayer(target);

        const currentLevelXP = player.xp % 100;
        const neededXP = 100;

        const totalGames =
            (player.wins || 0) +
            (player.losses || 0);

        const winRate =
            totalGames > 0
                ? Math.round((player.wins / totalGames) * 100)
                : 0;

        const badges = player.badges?.length
            ? player.badges.map(b => `• ${b}`).join('\n')
            : 'لا يوجد شارات';

        const inventory = player.inventory?.length
            ? player.inventory
                  .slice(0, 5)
                  .map(i => `• ${i.name}`)
                  .join('\n')
            : 'فارغ';

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle(`👤 NEXUS Profile`)
            .setThumbnail(target.displayAvatarURL())
            .setDescription(
                `${target}\n\n` +
                `💰 Coins: \`${player.coins}\`\n` +
                `⭐ Level: \`${player.level}\`\n` +
                `🔥 Win Streak: \`${player.streak}\`\n` +
                `🎁 Daily Streak: \`${player.dailyStreak}\`\n\n` +

                `📊 XP Progress\n` +
                `${progressBar(currentLevelXP, neededXP)}\n` +
                `\`${currentLevelXP}/100 XP\`\n\n` +

                `🏆 Wins: \`${player.wins}\`\n` +
                `❌ Losses: \`${player.losses}\`\n` +
                `🎮 Games Played: \`${player.gamesPlayed}\`\n` +
                `📈 Win Rate: \`${winRate}%\`\n\n` +

                `🏅 Badges\n${badges}\n\n` +

                `🎒 Inventory\n${inventory}`
            )
            .setFooter({
                text: 'NEXUS COMMUNITY • Advanced Profile System'
            })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed]
        });
    }
};