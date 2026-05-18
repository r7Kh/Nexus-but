module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;

        if (
            customId.startsWith('game_') ||
            customId.startsWith('nxg_') ||
            customId.startsWith('mafia_') ||
            customId.startsWith('ticket_') ||
            customId.startsWith('shop_')
        ) {
            return;
        }

        return;
    }
};