const logger = require('../utils/logger');

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.slashCommands.get(interaction.commandName);

        if (!command) {
            logger.warn(`Unknown slash command used: ${interaction.commandName}`);
            return;
        }

        logger.info(
            `${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`
        );

        try {
            await command.execute(interaction, client);
        } catch (error) {
            logger.error(`
━━━━━━━━━━━━━━
❌ Slash Command Error
📌 Command: ${interaction.commandName}
👤 User: ${interaction.user.tag}
🏠 Server: ${interaction.guild?.name || 'DM'}
📝 Error:
${error.stack || error}
━━━━━━━━━━━━━━
`);

            if (interaction.replied || interaction.deferred) {
                return;
            }

            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                flags: 64
            }).catch(() => {});
        }
    }
};