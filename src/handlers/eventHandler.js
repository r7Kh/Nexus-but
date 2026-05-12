const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../events');

    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));

        if (!event.name || typeof event.execute !== 'function') {
            logger.warn(`Invalid event file skipped: ${file}`);
            continue;
        }

        if (event.once) {
            client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
            client.on(event.name, (...args) => event.execute(client, ...args));
        }

        logger.info(`Loaded event: ${event.name} from ${file}`);
    }

    logger.info(`Loaded ${eventFiles.length} events`);
};