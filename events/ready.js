const colors = require('colors');
const { mkdir, realpath } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
/**
 * @param {Discord.Client} client discord.js client
 */
module.exports = async (client) => {
	const {
		user,
		users,
		channels,
		commands,
		guilds,
		application: bot,
		_slashCommands: uninitalizedSlashCommands,
		tempDir,
		botAdmins,
	} = client;
	client.botAdmins =
		bot.owner?.constructor.name === 'Team'
			? bot.owner.members.map((x) => x.user.id)
			: [bot.owner?.user.id || '387062216030945281'];
	user.setActivity(`Easy SMP`, { type: 'WATCHING' });
	client.slashCommands = await bot.commands.set(uninitalizedSlashCommands);
	console.log(
		colors.brightRed(
			'The bot has successfully started.\n---\n' +
				`Serving ${users.cache.size} users, ${botAdmins.length} bot admins, ${channels.cache.size} channels, and ${guilds.cache.size} guilds with ${commands.size} commands!`,
		),
	);
	if (process.send) process.send('ready');
	client.tempDir = join(await realpath(tmpdir()), 'Nana');
	mkdir(tempDir).catch(() => {});
};
