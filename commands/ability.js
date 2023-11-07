const Discord = require('discord.js');
const axios = require('axios').default;
const yaml = require('js-yaml');

/**
 *
 * @param partialValue
 * @param totalValue
 */
function percentage(partialValue, totalValue) {
	return (100 * partialValue) / totalValue;
}
const capitalize = (text) => {
	text = text?.toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ');
	const array = text?.split(' ');
	for (let index = 0; index < array.length; index++) {
		array[index] = array[index][0]?.toUpperCase() + array[index]?.slice(1);
	}
	return array?.join(' ');
};
const normalizeAbilities = (array) => {
	array?.forEach(function (value, index) {
		this[index] = capitalize(value.toLowerCase());
	}, array); // use arr as this
	return array;
};
const minecraftToDiscord = (string_) => {
	return string_
		.replaceAll(/§./g, '')
		.replaceAll(/&./g, '')
		.replaceAll(/#[\da-f]{8}|#[\da-f]{6}|#[\da-f]{4}|#[\da-f]{3}/gi, '');
};

const stringSimilarity = require('string-similarity');
const rangeParser = require('parse-numeric-range');

/**
 *
 * @param number_
 */
function romanize(number_) {
	if (isNaN(number_) && !isNaN(Number(number_))) number_ = Number(number_);
	if (isNaN(number_)) {
		const range = rangeParser(number_);
		return `${romanize(range[0])} to ${romanize(range.at(-1))}`;
	}
	let digits = String(+number_).split(''),
		key = [
			'',
			'C',
			'CC',
			'CCC',
			'CD',
			'D',
			'DC',
			'DCC',
			'DCCC',
			'CM',
			'',
			'X',
			'XX',
			'XXX',
			'XL',
			'L',
			'LX',
			'LXX',
			'LXXX',
			'XC',
			'',
			'I',
			'II',
			'III',
			'IV',
			'V',
			'VI',
			'VII',
			'VIII',
			'IX',
		],
		roman = '',
		index = 3;
	while (index--) roman = (key[+digits.pop() + index * 10] || '') + roman;
	return Array.from({ length: +digits.join('') + 1 }).join('M') + roman;
}
const sass = require('../sass.json').success;
module.exports = {
	aliases: [],
	arguments: [
		{
			description: 'Enter Infernal ability to search',
			name: 'ability',
			required: true,
			type: 'string',
		},
	],
	description: 'Search the Infernal Mobs Reloaded wiki for Infernal ability stats!',
	// Array of guild IDs that this command can be ran in.
	examples: [],

	/**
	 * @param {Discord.Message} message Message class
	 * @param {Array<string>} args User provided arguments.
	 * @param arguments_
	 * @param {Discord.Client} client Discord.js client
	 * @param {object} flags User provided flags
	 * @param {Array<string>} parsedArgs Parsed arguments like "discord epic" are seen as one argument.
	 * @param parsedArguments
	 */
	async execute(message, arguments_, client, flags, parsedArguments) {
		const runningAsInteraction = message instanceof Discord.BaseInteraction;
		let lastMessage;
		/**
		 * @param {Discord.Message} whatever Message class
		 */
		let send = (whatever) => {
			if (runningAsInteraction) {
				message
					.reply(whatever)
					.then((m) => {
						lastMessage = m;
					})
					.catch(console.error);
			} else {
				message.channel
					.send(whatever)
					.then((m) => {
						lastMessage = m;
					})
					.catch(console.error);
			}
		};
		let response;
		let response2;
		let response3;
		try {
			response = await axios.get(
				'https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/mobs.yml',
			);
			if (!response || !response?.data) throw new TypeError();
			response2 = await axios.get(
				'https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/config.yml',
			);
			if (!response2 || !response2?.data) throw new TypeError();
			response3 = await axios.get(
				'https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/abilities.yml',
			);
			if (!response3 || !response3?.data) throw new TypeError();
		} catch (error) {
			console.error(error);
			return send('Oh dang it! I ran into a stupid error. Perhaps GitHub is down?');
		}
		let bossData;
		let configData;
		let abilityData;
		try {
			bossData = yaml.load(response.data);
			configData = yaml.load(response2.data);
			abilityData = yaml.load(response3.data);
		} catch (error) {
			console.error(error);
			return send(
				`I couldn't parse the configuration files from InfernalMobsReloaded!\n\`\`\`${error.toString()}\`\`\``,
			);
		}
		//   console.log(bossData.filter(x => x['loot-table'][0]))
		let abilityName =
			parsedArguments?.join(' ')?.toLowerCase().replaceAll(' ', '-') || Object.keys(abilityData).random();
		let ability = abilityData[abilityName];
		if (!ability) {
			const targets = stringSimilarity.findBestMatch(
				capitalize(abilityName),
				normalizeAbilities(Object.keys(abilityData)),
			);
			const filter = (index) => index.customId === 'yes' && index.user.id === message.author.id;

			const collector = message.channel.createMessageComponentCollector({
				filter,
				time: 15_000,
			});

			collector.on('collect', async (index) => {
				console.log('collected', index);
				if (index.customId === 'yes') {
					ability = abilityData[targets.bestMatch.target.toLowerCase().replaceAll(' ', '-')];
					abilityName = targets.bestMatch.target.toLowerCase().replaceAll(' ', '-');
					await handleEmbed();
				}
			});
			if (targets.bestMatch.rating >= 0.6) {
				ability = abilityData[targets.bestMatch.target.toLowerCase().replaceAll(' ', '-')];
				abilityName = targets.bestMatch.target.toLowerCase().replaceAll(' ', '-');
			} else if (targets.bestMatch.rating <= 0.5 && targets.bestMatch.rating > 0.1) {
				const row = new Discord.MessageActionRow().addComponents(
					new Discord.MessageButton().setCustomId('yes').setLabel('Yes').setStyle('SUCCESS'),
				);
				send({
					components: [row],
					content: `Did you mean \`${targets.bestMatch.target}\`? (${Math.round(
						100 * targets.bestMatch.rating,
					)}% Match)`,
				});
				return (send = (whatever) => {
					if (runningAsInteraction) {
						message.editReply(whatever);
					} else {
						lastMessage.edit(whatever);
					}
				});
			} else {
				return send("Couldn't find any Ancient Infernal ability under the name: " + `\`${abilityName}\``);
			}
		}
		await handleEmbed();
		/**
		 *
		 */
		async function handleEmbed() {
			const properties = [];
			for (const [key, value] of Object.entries(abilityData[abilityName])) {
				if (key === 'Description') continue;
				properties.push(`${capitalize(key)}: ${value}`);
			}
			const canHaveAbilityList = Object.entries(bossData)
				.filter((x) => !x[1]['blacklisted-abilities']?.includes(abilityName.toUpperCase()))
				.map((x) => `${capitalize(x[0])}`);
			const abilityEmbed = new Discord.EmbedBuilder();
			const options = {
				components: [],
				embeds: [
					abilityEmbed
						.setTitle(capitalize(abilityName))
						.setDescription(
							`
            **Description**: ${ability.Description || 'None.. Must of been lost to the ages of time.'}
            **Disabled**: ${configData['disabled-abilities']?.includes(abilityName) ? 'Yes' : 'No'}
            **Properties**: 
            - ${properties.join('\n- ')}
            **Can be used by**:
            - ${canHaveAbilityList.join('\n- ')}
            `,
						)
						.setColor(Discord.Colors.Orange)
						.setFooter({
							text: `One of the ${Object.keys(abilityData).length} abilties for Infernal Mobs Reloaded`,
						}),
				],
			};
			options.content = sass.random();
			send(options);
		}
	},

	guildOnly: false,

	name: 'ability',

	nsfwOnly: false,

	ownerOnly: false,

	specialGuilds: null,
};
