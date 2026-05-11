module.exports = {
    name: 'messageCreate',
    once: false,

    execute(client, message) {
        if (message.author.bot) return;

        const prefix = '!';

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);
        if (!command) return;

        try {
            command.execute(client, message, args);
        } catch (err) {
            console.error(err);
            message.reply('❌ حدث خطأ أثناء تنفيذ الأمر');
        }
    }
};