module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {

        if (!interaction.isChatInputCommand()) return;

        const command = client.slashCommands.get(interaction.commandName);

        if (!command) {
            return interaction.reply({
                content: '❌ الأمر غير موجود',
                ephemeral: true
            });
        }

        try {
            await command.execute(interaction, client);

        } catch (error) {

            console.log('━━━━━━━━━━━━━━');
            console.log('❌ خطأ داخل أمر Slash:');
            console.log('📌 الأمر:', interaction.commandName);
            console.error(error);
            console.log('━━━━━━━━━━━━━━');

            // مهم جدًا: لا نرد إذا تم الرد مسبقًا
            if (interaction.replied || interaction.deferred) return;

            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                flags: 64
            }).catch(() => {});
        }
    }
};