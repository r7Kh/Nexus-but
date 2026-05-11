const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('إنشاء لوحة التذاكر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🎫 نظام الشكاوي والدعم')
            .setDescription(`
مرحبًا بك في نظام التذاكر الخاص بالسيرفر

يرجى اختيار نوع التذكرة المناسب:

📗 ضد لاعب  
📘 ضد إداري  
🟥 ضد قيادة العصابة  
🛠 الدعم الفني  
👑 قائد التحالف  
📥 تقديم على الإدارة  

بعد الاختيار سيتم إنشاء تذكرة خاصة بك.
            `);

        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('اختر نوع التذكرة')
            .addOptions([
                {
                    label: 'ضد لاعب',
                    value: 'player_report',
                    emoji: '📗'
                },
                {
                    label: 'ضد إداري',
                    value: 'admin_report',
                    emoji: '📘'
                },
                {
                    label: 'ضد قيادة العصابة',
                    value: 'gang_report',
                    emoji: '🟥'
                },
                {
                    label: 'الدعم الفني',
                    value: 'support',
                    emoji: '🛠'
                },
                {
                    label: 'قائد التحالف',
                    value: 'alliance',
                    emoji: '👑'
                },
                {
                    label: 'تقديم على الإدارة',
                    value: 'staff_apply',
                    emoji: '📥'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};