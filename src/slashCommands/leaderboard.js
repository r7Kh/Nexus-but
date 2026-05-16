const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/games.json');

function getData() {
    if (!fs.existsSync(dbPath)) {
        return { players: {} };
    }

    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function medal(index) {
    if (index === 0) return '👑';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '•';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('عرض ترتيب لاعبين NEXUS')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('نوع الترتيب')
                .setRequired(true)
                .addChoices(
                    { name: 'Coins', value: 'coins' },
                    { name: 'XP', value: 'xp' },
                    { name: 'Wins', value: 'wins' },
                    { name: 'Level', value: 'level' }
                )
        ),

    async execute(interaction) {
        const type = interaction.options.getString('type');

        const data = getData();

        const players = Object.values(data.players || {});

        if (!players.length) {
            return interaction.reply({
                content: '❌ لا يوجد بيانات لاعبين بعد.',
                flags: 64
            });
        }

        const sorted = players.sort((a, b) => {
            return (b[type] || 0) - (a[type] || 0);
        });

        const top10 = sorted.slice(0, 10);

        const currentUserIndex = sorted.findIndex(
            p => p.userId === interaction.user.id
        );

        let description = '';

        top10.forEach((player, index) => {
            description +=
                `${medal(index)} ` +
                `**#${index + 1}** ` +
                `<@${player.userId}>` +
                ` — \`${player[type] || 0}\`\n`;
        });

        if (currentUserIndex !== -1) {
            description +=
                `\n━━━━━━━━━━━━━━\n` +
                `📍 ترتيبك الحالي: **#${currentUserIndex + 1}**`;
        }

        const titles = {
            coins: '💰 Coins Leaderboard',
            xp: '⭐ XP Leaderboard',
            wins: '🏆 Wins Leaderboard',
            level: '🌟 Level Leaderboard'
        };

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle(`📊 ${titles[type]}`)
            .setDescription(description)
            .setFooter({
                text: 'NEXUS COMMUNITY • Competitive Rankings'
            })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed]
        });
    }
};