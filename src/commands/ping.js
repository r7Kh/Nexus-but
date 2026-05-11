module.exports = {
    name: "ping",

    execute(client, message, args) {
        message.reply(`🏓 Pong! Latency: ${client.ws.ping}ms`);
    }
};