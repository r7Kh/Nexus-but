require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { REST, Routes } = require('discord.js');

const commands = [];

function loadSlashCommands(folderPath) {
    if (!fs.existsSync(folderPath)) return;

    const commandFiles = fs
        .readdirSync(folderPath)
        .filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        console.log(`📂 Loading: ${filePath}`);

        if (!command.data) {
            console.log(`❌ Missing "data" in ${file}`);
            continue;
        }

        commands.push(command.data.toJSON());

        console.log(`✅ Loaded Slash Command: ${command.data.name}`);
    }
}

loadSlashCommands(path.join(__dirname, 'slashCommands'));
loadSlashCommands(path.join(__dirname, 'systems/nexusCity/commands'));

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('🚀 Deploying slash commands...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`✅ Slash commands deployed successfully: ${commands.length}`);
    } catch (error) {
        console.error(error);
    }
})();