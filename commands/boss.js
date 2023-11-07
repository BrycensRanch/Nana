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
	text = text.toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ');
	const array = text.split(' ');
	for (let index = 0; index < array.length; index++) {
		array[index] = array[index][0].toUpperCase() + array[index].slice(1);
	}
	return array.join(' ');
};
const normalizeAbilities = (array) => {
	array?.forEach(function (value, index) {
		this[index] = capitalize(value.toLowerCase());
	}, array); // use arr as this
	return array;
};
const mobMappings = require('../mappings.json');
const stringSimilarity = require('string-similarity');
const item = require('./item');

module.exports = {
	aliases: [],
	arguments: [
		{
			description: 'Enter Infernal to search',
			name: 'infernal',
			required: true,
			type: 'string',
		},
	],
	description: 'Search the Infernal Mobs Reloaded wiki for boss stats!',
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
		const sass = require('../sass.json').success;
		const runningAsInteraction = message instanceof Discord.BaseInteraction;
		let lastMessage;
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
		try {
			response = await axios.get(
				'https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/mobs.yml',
			);
			if (!response || !response?.data) throw new TypeError();
		} catch {
			console.error(error);
			return send('Oh dang it! I ran into a stupid error. Perhaps GitHub is down?');
		}
		const bossData = yaml.load(response.data);
		let bossName = parsedArguments?.join(' ')?.toLowerCase().replaceAll(' ', '_') || Object.keys(bossData).random();
		let boss = bossData[bossName];
		if (!boss) {
			const targets = stringSimilarity.findBestMatch(capitalize(bossName), normalizeAbilities(Object.keys(bossData)));
			const filter = (index) => index.customId === 'yes' && index.user.id === message.author.id;

			const collector = message.channel.createMessageComponentCollector({ filter, time: 15_000 });
			/**
			 * @param {Discord.ButtonInteraction} i
			 */
			collector.on('collect', async (index) => {
				if (index.customId === 'yes') {
					boss = bossData[targets.bestMatch.target.toLowerCase().replaceAll(' ', '_')];
					bossName = targets.bestMatch.target.toLowerCase().replaceAll(' ', '_');
					await handleEmbed();
				}
			});
			if (targets.bestMatch.rating >= 0.6) {
				boss = bossData[targets.bestMatch.target.toLowerCase().replaceAll(' ', '_')];
				bossName = targets.bestMatch.target.toLowerCase().replaceAll(' ', '_');
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
				return send("Couldn't find any Ancient Infernal under the name: " + `\`${bossName}\``);
			}
		}
		await handleEmbed();
		/**
		 *
		 */
		async function handleEmbed() {
			const bossDisplayName = capitalize(bossName);
			const bossEmbed = new Discord.EmbedBuilder();
			if (runningAsInteraction) console.log(message.options);
			boss.image = mobMappings[bossDisplayName] || mobMappings[capitalize(boss.type)];
			if (boss.image) bossEmbed.setThumbnail(boss.image);
			const options = {
				components: [],
				embeds: [
					bossEmbed
						.setTitle(`${bossDisplayName} ` + `(${capitalize(boss.type)})`)
						.setDescription(
							`
            **Spawn Chance**: ${Math.round(100 * boss['spawn-chance'])}%

            **Forced Abilities**: 
            - ${normalizeAbilities(boss['forced-abilities'])?.join('\n- ') || 'None, fully RNG!'}

            **Blacklisted Abilities**: 
            - ${normalizeAbilities(boss['blacklisted-abilities'])?.join('\n- ') || 'None, fully RNG!'}

            **Ability Amount**: ${boss['ability-amount'] || 'Unknown'}
            ${boss['forced-abilities'] ? `**Forced Abilities**: ${boss['forced-abilities'].join(', ')}\n` : ''}${
							boss['blacklisted-abilities']
								? `**Blacklisted Abilities**: ${boss['blacklisted-abilities'].join(', ')}\n`
								: ''
						}
            **Loot Table**: 
            - ${
							boss['loot-table']
								?.map((x) => `${capitalize(x.split(':')[0])} (${Math.round(Number(x.split(':')[1]) * 100)}% Chance)`)
								.join('\n- ') || 'None, only drops stuff from global_drops.yml'
						}\n
            **Modifiers**:
             
            - Has ${boss['follow-range-multiplier'] || 1} times the normal range of a ${capitalize(boss.type)}
            - Has ${boss['health-multiplier'] || 1} times the normal health of a ${capitalize(boss.type)}
            - Does ${boss['damage-multiplier'] || 1} times the normal damage of a ${capitalize(boss.type)}
            `,
						)
						.setColor(Discord.Colors.Fuchsia),
				],
			};
			options.content = sass.random();
			send(options);
		}
	},

	guildOnly: false,

	name: 'boss',

	nsfwOnly: false,

	ownerOnly: false,

	specialGuilds: null,
};
