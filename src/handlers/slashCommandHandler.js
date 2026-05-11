const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    client.slashCommands = new Map();

    const commandsPath = path.join(__dirname, '../slashCommands');

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));

        console.log(`📂 Loading slash command: ${file}`);

        if (!command.data || !command.data.name) {
            console.log(`❌ Invalid slash command file: ${file}`);
            continue;
        }

        client.slashCommands.set(command.data.name, command);
    }

    console.log(`⚡ Loaded ${client.slashCommands.size} slash commands`);
};