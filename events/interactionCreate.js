const Discord = require('discord.js');
/**
 * @param client
 * @param {Discord.BaseInteraction} interaction
 */
module.exports = async (client, interaction) => {
	const { CommandHandler } = client;
	if (interaction.isCommand()) await CommandHandler.handleSlashCommand(interaction);
	if (interaction.isAutocomplete()) await CommandHandler.handleAutocomplete(interaction);
};
