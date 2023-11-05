const Discord = require('discord.js');
  module.exports = {
    name: "help",
    description: "Help me, please!",
    examples: ['help wiki'],
    /** 
     * @param {Discord.Message} message Message class
     * @param {Array} args User provided arguments.
     * @param {Discord.Client} client Discord.js client
     * @param {Object} flags User provided flags
     * @param {Array} parsedArgs Parsed arguments like "discord epic" are seen as one argument.
    */
    async execute(message, args, client, flags, parsedArgs) {
        return await message.channel.send(
          {
            embeds: [
              new Discord.MessageEmbed()
              .setColor('PURPLE')
              .setDescription(client.commands.filter(x => !x.ownerOnly).map(x => `**${x.name}** - ${x.description || "Description hasn't been set yet, what's up!?!?"}`).join("\n"))
              .setThumbnail(message.guild?.iconURL() || message.author.displayAvatarURL())
              .setTitle(`${client.user.username}${message.guild ? ' | ' + message.guild.name : ''}`)
            ]
          }
          );
    }
  };