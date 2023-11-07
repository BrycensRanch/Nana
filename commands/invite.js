const Discord = require('discord.js');

module.exports = {
	description: 'Invite Nana or share around the invite!',
	examples: [],
	/**
	 * @param {Discord.Message} message Message class
	 * @param {Array} args User provided arguments.
	 * @param arguments_
	 * @param {Discord.Client} client Discord.js client
	 */
	async execute(message, arguments_, client) {
		// Do not remove this command for anyone interested in using this code - the bot is licensed under AGPL v3.
		// To do so without making it clear where the source code is in violation of the license. smh
		return message.channel.send({
			embeds: [
				new Discord.EmbedBuilder()
					.setDescription(
						`Oh, so you want to **invite** ME?
          Well, you can't you dumby! I'm devoted to Easy SMP! Maybe in the future I can consider joining your amazing guild, though!
          My source code is available at https://github.com/BrycensRanch/Nana`,
					)
					.setColor(Discord.Colors.LuminousVividPink)
					.setTitle('Not so fast!'),
			],
		});
	},

	name: 'invite',
};
