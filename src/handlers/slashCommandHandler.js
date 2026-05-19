const fs = require('fs');
const path = require('path');

function loadSlashCommands(client, folderPath) {
    if (!fs.existsSync(folderPath)) {
        console.log(`⚠️ Slash commands folder not found: ${folderPath}`);
        return;
    }

    const commandFiles = fs
        .readdirSync(folderPath)
        .filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));

        console.log(`📂 Loading slash command: ${file}`);

        if (!command.data || !command.data.name) {
            console.log(`❌ Invalid slash command file: ${file}`);
            continue;
        }

        client.slashCommands.set(command.data.name, command);
    }
}

module.exports = (client) => {
    client.slashCommands = new Map();

    loadSlashCommands(client, path.join(__dirname, '../slashCommands'));
    loadSlashCommands(client, path.join(__dirname, '../systems/nexusCity/commands'));

    console.log(`⚡ Loaded ${client.slashCommands.size} slash commands`);
};