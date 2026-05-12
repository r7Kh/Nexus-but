const logger = require('../utils/logger');

module.exports = {
    name: 'clientReady',
    once: true,

    execute(client) {

        logger.info(`NEXUS BOT ONLINE AS ${client.user.tag}`);

        client.user.setPresence({
            activities: [
                {
                    name: 'NEXUS COMMUNITY',
                    type: 3
                }
            ],
            status: 'online'
        });

    }
};