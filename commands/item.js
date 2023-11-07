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
			description: 'Enter Item to search',
			name: 'item',
			required: true,
			type: 'string',
		},
	],
	description: 'Search the Infernal Mobs Reloaded wiki for item stats!',
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
		let response4;
		try {
			response = await axios.get(
				'https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/mobs.yml',
			);
			if (!response || !response?.data) throw new TypeError();
			response2 = await axios.get(
				'https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/loot_table.yml',
			);
			if (!response2 || !response2?.data) throw new TypeError();
			response3 = await axios.get(
				'https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/global_drops.yml',
			);
			if (!response3 || !response3?.data) throw new TypeError();
			response4 = await axios.get(
				'https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/charms.yml',
			);
			if (!response4 || !response4?.data) throw new TypeError();
		} catch (error) {
			console.error(error);
			return send('Oh dang it! I ran into a stupid error. Perhaps GitHub is down?');
		}
		let bossData;
		let itemData;
		let globalData;
		let charmData;
		try {
			bossData = yaml.load(response.data);
			itemData = yaml.load(response2.data);
			globalData = yaml.load(response3.data);
			charmData = yaml.load(response4.data);
		} catch (error) {
			console.error(error);
			return send(
				`I couldn't parse the configuration files from InfernalMobsReloaded!\n\`\`\`${error.toString()}\`\`\``,
			);
		}
		//   console.log(bossData.filter(x => x['loot-table'][0]))
		let itemName = parsedArguments?.join(' ')?.toLowerCase().replaceAll(' ', '_') || Object.keys(itemData).random();
		let item = itemData[itemName];
		if (!item) {
			const targets = stringSimilarity.findBestMatch(capitalize(itemName), normalizeAbilities(Object.keys(itemData)));
			const filter = (index) => index.customId === 'yes' && index.user.id === message.author.id;

			const collector = message.channel.createMessageComponentCollector({
				filter,
				time: 15_000,
			});

			collector.on('collect', async (index) => {
				console.log('collected', index);
				if (index.customId === 'yes') {
					item = itemData[targets.bestMatch.target.toLowerCase().replaceAll(' ', '_')];
					itemName = targets.bestMatch.target.toLowerCase().replaceAll(' ', '_');
					await handleEmbed();
				}
			});
			if (targets.bestMatch.rating >= 0.6) {
				item = itemData[targets.bestMatch.target.toLowerCase().replaceAll(' ', '_')];
				itemName = targets.bestMatch.target.toLowerCase().replaceAll(' ', '_');
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
				return send("Couldn't find any Ancient Infernal Item under the name: " + `\`${itemName}\``);
			}
		}
		await handleEmbed();
		/**
		 *
		 */
		async function handleEmbed() {
			const mobDroppers = Object.entries(bossData)
				.filter((x) => x[1]['loot-table'].find((l) => l.includes(itemName)))
				.map(
					(x, index) =>
						`${capitalize(x[0])} (${Math.round(
							Number(
								x[1]['loot-table']
									.filter((loot) => loot.includes(itemName))
									.join(', ')
									.split(':')[1],
							) * 100,
						)}% Chance)`,
				);
			const isGlobalDrop = globalData['global-drops'].find((d) => d.includes(itemName));
			if (isGlobalDrop)
				mobDroppers.push(
					`Any Infernal (${
						Number(capitalize(globalData['global-drops'].find((d) => d.includes(itemName)).split(':')[1])).toFixed(10) *
						100
					}% Chance)`,
				);
			const itemEmbed = new Discord.EmbedBuilder();
			const options = {
				components: [],
				embeds: [
					itemEmbed
						.setTitle(`${capitalize(itemName)} ` + `(${capitalize(item.material)})`)
						.setDescription(
							`
            **Display Name**: ${item.name || capitalize(itemName)}${
							item.amount && item.amount !== '1' && item.amount !== undefined && item.amount !== 'undefined'
								? ''
								: `\n**Amount**: ${item.amount || '1'}`
						}
            **Obtainable**: ${!mobDroppers[0] && !isGlobalDrop ? 'No' : 'Yes'}
            **Lore**: 
            ${
							item?.lore && item.lore[0]
								? !item.lore.forEach((x, index) => (item.lore[index] = minecraftToDiscord(x))) && item.lore.join('\n')
								: 'None, lost to the ages'
						}
            **Effects**: 
            - ${
							Object.entries(charmData['charm-effects'])
								.filter((x) => x[1]['required-items']?.includes(itemName) || x[1]['main-hand'] == itemName)
								.map(
									(x) =>
										`${capitalize(x[1].effect)} ${romanize(x[1].potency)} [Type: ${capitalize(
											x[1]['effect-mode'] || 'SELF_PERMANENT',
										)} | Duration: ${x[1].duration || 'PERM'} | Delay: ${x[1].delay || 1}] `,
								)
								.join('\n- ') || 'Nothing...'
						}
            **Enchants**: 
            - ${
							item.enchants
								?.map(
									(x) =>
										`${capitalize(x.split(':')[0])} ${
											x.split(':')[1] == '1' ? '' : romanize(x.split(':')[1])
										} (${Math.round(x.split(':')[2] * 100 || 100)}% Chance)`,
								)
								.join('\n- ') || 'Nothing...'
						}
            ${mobDroppers[0] ? `**Dropped by**:\n - ${mobDroppers.join('\n- ')}` : ''}
            `,
						)
						.setColor(Discord.Colors.Blurple)
						.setFooter({
							text: `One of the ${Object.keys(itemData).length} items for Infernal Mobs Reloaded`,
						}),
					// **Ability Amount**: ${boss['ability-amount'] || 'Unknown'}

					// **Loot Table**:
					// - ${boss['loot-table']?.join("\n- ") || 'None, only drops stuff from global_drops.yml'}
					// —————————————
					// **Modifiers**:
					// - Has ${boss['follow-range-multiplier'] || 0} times the normal range of a ${capitalize(boss.type)}
					// - Has ${boss['health-multiplier'] || 0} times the normal health of a ${capitalize(boss.type)}
					// - Does ${boss['damage-multiplier'] || 0} times the normal damage of a ${capitalize(boss.type)}
				],
			};
			options.content = sass.random();
			send(options);
		}
	},

	guildOnly: false,

	name: 'item',

	nsfwOnly: false,

	ownerOnly: false,

	specialGuilds: null,
};
