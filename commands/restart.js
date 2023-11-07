const { exec } = require('node:child_process');
const Discord = require('discord.js');

module.exports = {
	description: 'Restart Nana',
	examples: ['restart my love for coding'],
	/**
	 * @param {Discord.Message} message
	 * @param flags
	 * @param {Discord.Client} client
	 */
	async execute(message, [], client, flags) {
		await message.channel.send("👋 | See ya, wouldn't wanna be ya!").catch(() => null);
		client.destroy();
		if (flags.pm2) {
			exec(`pm2 restart ${process.env.pm_id}`);
		} else {
			process.exit(69);
		}
	},

	name: 'restart',

	ownerOnly: true,
};
