const Discord = require('discord.js');

module.exports = {
	aliases: [],
	description: '',
	// Array of guild IDs that this command can be ran in.
	examples: [],

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
		// !hello "im a living legend" -msg=3 --ubi
		console.log(message.author.tag, arguments_, client.user.tag, flags, parsedArguments);
		// Expected output:
		// Romvnly#5369 [ '"im', 'a', 'living', 'legend"' ] pogchamp#3970 { msg: '3', ubi: true } [ 'im a living legend' ]
		return await message.channel.send('Hello, beautiful world!');
	},

	guildOnly: false,

	name: 'hello',

	nsfwOnly: false,

	ownerOnly: false,

	specialGuilds: null,
};
