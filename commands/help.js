const Discord = require('discord.js');
module.exports = {
	description: 'Help me, please!',
	examples: ['help wiki'],
	/**
	 * @param {Discord.Message} message Message class
	 * @param {Array} args User provided arguments.
	 * @param arguments_
	 * @param {Discord.Client} client Discord.js client
	 * @param {object} flags User provided flags
	 * @param {Array} parsedArgs Parsed arguments like "discord epic" are seen as one argument.
	 * @param parsedArguments
	 */
	async execute(message, arguments_, client, flags, parsedArguments) {
		return await message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor('PURPLE')
					.setDescription(
						client.commands
							.filter((x) => !x.ownerOnly)
							.map((x) => `**${x.name}** - ${x.description || "Description hasn't been set yet, what's up!?!?"}`)
							.join('\n'),
					)
					.setThumbnail(message.guild?.iconURL() || message.author.displayAvatarURL())
					.setTitle(`${client.user.username}${message.guild ? ` | ${message.guild.name}` : ''}`),
			],
		});
	},

	name: 'help',
};
