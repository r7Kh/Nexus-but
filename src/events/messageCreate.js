const staffStatsDB = require('../utils/staffStatsDB');
const { ADMIN_ROLE_IDS, MODERATION_ROLE_IDS } = require('../utils/permissions');

function isStaffMember(member) {
    if (!member || !member.roles) return false;

    return member.roles.cache.some(role =>
        ADMIN_ROLE_IDS.includes(role.id) ||
        MODERATION_ROLE_IDS.includes(role.id)
    );
}

module.exports = {
    name: 'messageCreate',
    once: false,

    execute(client, message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        if (isStaffMember(message.member)) {
            staffStatsDB.addMessage(message.author.id);
        }

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