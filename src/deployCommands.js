require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { REST, Routes } = require('discord.js');

const commands = [];

const commandsPath = path.join(__dirname, 'slashCommands');

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    const command = require(filePath);

    console.log(`📂 Loading: ${file}`);

    if (!command.data) {
        console.log(`❌ Missing "data" in ${file}`);
        continue;
    }

    commands.push(command.data.toJSON());

    console.log(`✅ Loaded Slash Command: ${command.data.name}`);
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('🚀 Deploying slash commands...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('✅ Slash commands deployed successfully');
    } catch (error) {
        console.error(error);
    }
})();