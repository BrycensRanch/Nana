const { default: axios } = require('axios');
const Discord = require('discord.js');
const { Repository } = require('typeorm');
const humanizedPreferences = {
	game: 'Main Game',
};
let Filter = require('bad-words');
let swearFilter = new Filter({ placeHolder: '#' });
swearFilter.addWords(
	'anal',
	'anus',
	'arse',
	'ass',
	'b1tch',
	'ballsack',
	'bastard',
	'bitch',
	'biatch',
	'blowjob',
	'bollock',
	'bollok',
	'boner',
	'boob',
	'boobs',
	'buttplug',
	'clitoris',
	'cock',
	'cum',
	'cunt',
	'dick',
	'dildo',
	'dyke',
	'erection',
	'fag',
	'faggot',
	'feck',
	'fellate',
	'fellatio',
	'felching',
	'fuck',
	'fucks',
	'fudgepacker',
	'genitals',
	'hell',
	'jerk',
	'jizz',
	'knobend',
	'labia',
	'masturbate',
	'muff',
	'nigger',
	'nigga',
	'penis',
	'piss',
	'poop',
	'pube',
	'pussy',
	'scrotum',
	'sex',
	'shit',
	'sh1t',
	'slut',
	'smegma',
	'spunk',
	'tit',
	'tranny',
	'trannies',
	'tosser',
	'turd',
	'twat',
	'vagina',
	'wank',
	'whore',
	'tits',
	'titty',
	'asshole',
	'fvck',
	'asshat',
	'pu55y',
	'pen1s',
	'sexual',
	'sex',
	'nudes',
	'nigga',
	'nigger',
	'nig',
);
const { UserSettings: settingsModel } = require('../sqliteModel/UserSettings');
module.exports = {
	aliases: ['config', 'description'],
	description: 'Change/view your settings for Nana!',
	examples: [],
	/**
	 * @param {Discord.Message} message Message class
	 * @param {Array} args User provided arguments.
	 * @param arguments_
	 * @param {Discord.Client} client Discord.js client
	 */
	async execute(message, arguments_, client) {
		if (arguments_.executor == 'description') {
			if (!arguments_[0]) return message.channel.send(':x: | Specify your description or burn!');
			const description = swearFilter.clean(arguments_.join(' '));
			if (description.length > 200)
				return message.channel.send(':x: | Your description may not be any longer than 200 characters.');
			/** @type {Repository} */
			const LinkedAccounts = client.db.getRepository('LinkedAccount');
			/** @type {Repository} */
			const UserSettings = client.db2.getRepository(settingsModel);
			/** @type {Repository} */
			const linkedAccount = await LinkedAccounts.findOne({ discord: message.author.id });
			if (!linkedAccount)
				return message.channel.send("Far as I can tell, you're not linked to Minecraft. Run `/discord link` in-game.");
			/** @type {settingsModel} */
			const userSetting = await UserSettings.findOne({ uuid: linkedAccount.uuid });
			if (userSetting) {
				if (userSetting.description == description)
					return message.channel.send(
						':x: | You cannot put your description as what you already have it as... SEEMS CONFUSING, RIGHT? WELL, YOU DUMBY, FIGURE IT OUT',
					);
				await UserSettings.save({ description: description, discord: linkedAccount.discord, id: userSetting.id });
			} else {
				const result = await UserSettings.create({
					description,
					discord: linkedAccount.discord,
					uuid: linkedAccount.uuid,
				});
				await UserSettings.save(result);
				console.log(result);
			}
			return message.channel.send(':white_check_mark: | Description is set, probably.');
		} else {
			// const userPreferences = client.db()
			switch (arguments_[0].toLowerCase()) {
				case 'set': {
					break;
				}
				default: {
					return message.channel.send(
						':x: | Not a valid configuration option, back to square one. Rerun this command when you can make up your mind.',
					);
				}
			}
		}
	},

	name: 'settings',
};
