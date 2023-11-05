const Discord = require('discord.js');
/** 
 * @param {Discord.Interaction} interaction 
 */
 module.exports = async (client, interaction) => {
    const {CommandHandler} = client;
     if (interaction.isCommand()) CommandHandler.handleSlashCommand(interaction);
     if (interaction.isAutocomplete()) CommandHandler.handleAutocomplete(interaction);
 }