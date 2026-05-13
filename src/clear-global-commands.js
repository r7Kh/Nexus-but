require('dotenv').config();

const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('🧹 Clearing global slash commands...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );

        console.log('✅ Global slash commands cleared successfully');
    } catch (error) {
        console.error(error);
    }
})();