const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('عرض آخر عمليات الإدارة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();

        const logPath = path.join(__dirname, '../database/logs.json');

        if (!fs.existsSync(logPath)) {
            return interaction.editReply({
                content: '❌ لا يوجد سجل عمليات حالياً'
            });
        }

        const logs = JSON.parse(fs.readFileSync(logPath));

        if (!logs.length) {
            return interaction.editReply({
                content: '❌ لا يوجد سجلات حالياً'
            });
        }

        const latestLogs = logs
            .slice(-10)
            .reverse()
            .map((log, index) => {
                return `**${index + 1}.** ${log.action}
👮 المشرف: ${log.moderator}
🎯 الهدف: ${log.target}
📌 السبب: ${log.reason}
🕒 التاريخ: ${log.date}`;
            })
            .join('\n\n');

        return interaction.editReply({
            content: `📜 آخر السجلات:\n\n${latestLogs}`
        });
    }
};