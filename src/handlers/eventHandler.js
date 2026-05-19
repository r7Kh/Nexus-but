const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger');

function loadEvents(client, folderPath) {

    if (!fs.existsSync(folderPath)) return;

    const eventFiles = fs
        .readdirSync(folderPath)
        .filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {

        const event = require(path.join(folderPath, file));

        if (!event.name || typeof event.execute !== 'function') {
            logger.warn(`Invalid event file skipped: ${file}`);
            continue;
        }

        if (event.once) {
            client.once(event.name, (...args) =>
                event.execute(client, ...args)
            );
        } else {
            client.on(event.name, (...args) =>
                event.execute(client, ...args)
            );
        }

        logger.info(`Loaded event: ${event.name} from ${file}`);
    }
}

module.exports = (client) => {

    loadEvents(client, path.join(__dirname, '../events'));

    loadEvents(
        client,
        path.join(__dirname, '../systems/nexusCity/events')
    );

    logger.info('✅ All events loaded successfully');
};