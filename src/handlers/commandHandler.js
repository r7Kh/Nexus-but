const fs = require('fs');
const path = require('path');

function loadCommandsFromFolder(client, folderPath) {
    if (!fs.existsSync(folderPath)) {
        console.log(`⚠️ Commands folder not found: ${folderPath}`);
        return;
    }

    const commandFiles = fs
        .readdirSync(folderPath)
        .filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        const commandName = command.name || command.data?.name;

        if (commandName) {
            client.slashCommands.set(commandName, command);
            console.log(`📂 Loaded slash command: ${commandName}`);
        }
    }
}

module.exports = (client) => {
    client.slashCommands = new Map();

    loadCommandsFromFolder(client, path.join(__dirname, '../slashCommands'));
    loadCommandsFromFolder(client, path.join(__dirname, '../systems/nexusCity/commands'));

    console.log(`⚡ Loaded ${client.slashCommands.size} slash commands`);
};