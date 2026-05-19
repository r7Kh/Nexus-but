const fs = require('fs');
const path = require('path');

function loadCommandsFromFolder(client, folderPath) {
    if (!fs.existsSync(folderPath)) return;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));

        const commandName = command.name || command.data?.name;

        if (commandName) {
            client.slashCommands.set(commandName, command);
            console.log(`📂 Loaded command: ${commandName}`);
        }
    }
}

module.exports = (client) => {
    client.slashCommands = new Map();

    loadCommandsFromFolder(client, path.join(__dirname, '../commands'));
    loadCommandsFromFolder(client, path.join(__dirname, '../systems/nexusCity/commands'));

    console.log(`📦 Loaded ${client.slashCommands.size} commands`);
};