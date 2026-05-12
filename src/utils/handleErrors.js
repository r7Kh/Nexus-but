const logger = require('./logger');

module.exports = () => {
    process.on('unhandledRejection', (reason) => {
        logger.error(`Unhandled Rejection: ${reason}`);
    });

    process.on('uncaughtException', (error) => {
        logger.error(`Uncaught Exception: ${error.stack || error}`);
    });

    process.on('warning', (warning) => {
        logger.warn(`${warning.name}: ${warning.message}`);
    });
};