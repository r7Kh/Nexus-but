module.exports = [
    {
        id: 'first_win',
        name: '🏁 First Win',
        description: 'حقق أول فوز في ألعاب NEXUS.',
        check: player => player.wins >= 1
    },
    {
        id: 'five_wins',
        name: '🏆 Winner',
        description: 'حقق 5 انتصارات.',
        check: player => player.wins >= 5
    },
    {
        id: 'ten_wins',
        name: '👑 Champion',
        description: 'حقق 10 انتصارات.',
        check: player => player.wins >= 10
    },
    {
        id: 'hot_streak',
        name: '🔥 Hot Streak',
        description: 'وصل إلى Win Streak 5.',
        check: player => player.streak >= 5
    },
    {
        id: 'rich_player',
        name: '💰 Rich Player',
        description: 'اجمع 1000 Coins.',
        check: player => player.coins >= 1000
    },
    {
        id: 'daily_grinder',
        name: '🎁 Daily Grinder',
        description: 'وصل Daily Streak إلى 5 أيام.',
        check: player => player.dailyStreak >= 5
    },
    {
        id: 'level_5',
        name: '⭐ Rising Star',
        description: 'وصل إلى Level 5.',
        check: player => player.level >= 5
    },
    {
        id: 'level_10',
        name: '🌟 NEXUS Veteran',
        description: 'وصل إلى Level 10.',
        check: player => player.level >= 10
    },
    {
        id: 'games_25',
        name: '🎮 Active Player',
        description: 'العب 25 لعبة.',
        check: player => player.gamesPlayed >= 25
    },
    {
        id: 'games_100',
        name: '🕹️ Addicted Gamer',
        description: 'العب 100 لعبة.',
        check: player => player.gamesPlayed >= 100
    }
];