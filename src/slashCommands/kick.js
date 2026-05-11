const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kick')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ User not found in this server',
                ephemeral: true
            });
        }

        if (!member.kickable) {
            return interaction.reply({
                content: '❌ I cannot kick this user (role hierarchy issue)',
                ephemeral: true
            });
        }

        try {
            await member.kick(reason);

            return interaction.reply({
                content: `👢 ${user.tag} has been kicked\nReason: ${reason}`
            });

        } catch (err) {
            console.error(err);

            return interaction.reply({
                content: '❌ Failed to kick user',
                ephemeral: true
            });
        }
    }
};