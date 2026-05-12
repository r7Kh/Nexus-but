const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');

const createEmbed = require('../utils/embed');
const { hasAdminPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('إنشاء لوحة التذاكر'),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });

        if (!hasAdminPermission(interaction.member)) {
            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title: '🚫 NEXUS Permission System',
                        description: 'ليس لديك صلاحية لاستخدام هذا الأمر.',
                        thumbnail: client.user.displayAvatarURL()
                    })
                ]
            });
        }

        const embed = createEmbed({
            title: '🎫 NEXUS Ticket Center',
            description: `
مرحبًا بك في نظام التذاكر الخاص بـ **NEXUS COMMUNITY**

يرجى اختيار نوع التذكرة المناسب من القائمة بالأسفل.

📗 **شكوى ضد لاعب**
📘 **شكوى ضد إداري**
🛠 **الدعم الفني**
🎭 **تقديم على Role**

بعد الاختيار سيتم إنشاء تذكرة خاصة بك بشكل تلقائي.
            `,
            thumbnail: client.user.displayAvatarURL()
        });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('اختر نوع التذكرة')
            .addOptions([
                {
                    label: 'شكوى ضد لاعب',
                    description: 'فتح تذكرة للإبلاغ عن لاعب',
                    value: 'player_report',
                    emoji: '📗'
                },
                {
                    label: 'شكوى ضد إداري',
                    description: 'فتح تذكرة للإبلاغ عن إداري',
                    value: 'admin_report',
                    emoji: '📘'
                },
                {
                    label: 'الدعم الفني',
                    description: 'طلب مساعدة من فريق الدعم',
                    value: 'support',
                    emoji: '🛠'
                },
                {
                    label: 'تقديم على Role',
                    description: 'طلب الحصول على رتبة داخل السيرفر',
                    value: 'role_apply',
                    emoji: '🎭'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });

        return interaction.editReply({
            content: '✅ تم إنشاء لوحة التذاكر بنجاح.'
        });
    }
};