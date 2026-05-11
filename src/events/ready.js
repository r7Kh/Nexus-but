module.exports = {
    name: 'ready',
    once: true,

    execute(client) {
        console.log(`✅ NEXUS BOT ONLINE AS ${client.user.tag}`);
    }
};