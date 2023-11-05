const Discord = require('discord.js');

  module.exports = {
    name: "prefix",
    description: "View the prefix for Nana!",
    examples: [],
    /** 
    * @param {Discord.Message} message Message class
    * @param {Array} args User provided arguments.
    * @param {Discord.Client} client Discord.js client
    */
    async execute(message, args, client) {
        return message.channel.send({
          embeds: [        
            new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Blue)
            .setTitle(`Bot Prefix`)
            .setDescription(`The bot prefix for Nana is \`${client.config.prefix}\`. It cannot be changed unless by the bot admin(s)`)
            .setThumbnail(client.user.displayAvatarURL())]
        }
        )
    }
  };