const Discord = require('discord.js');
const axios = require('axios').default;
const Client = require('ssh2-sftp-client');
let properties = require('minecraft-server-properties');
const yaml = require('js-yaml');

const sftp = new Client();
const fs = require('node:fs');
const path = require('node:path');
const moment = require('moment');
const { relativeTime } = require('human-date');
const prettyPrint = (date) =>
	date.toLocaleDateString('en-us', { day: 'numeric', month: 'short', weekday: 'long', year: 'numeric' });
const removeFormatting = (s) => s.replaceAll(/\W/g, '');
const qs = require('qs');

/**
 *
 * @param ms
 * @param maxPrecission
 */
function durationAsString(ms, maxPrecission = 3) {
	const duration = moment.duration(ms);

	const items = [];
	items.push({ timeUnit: 'd', value: Math.floor(duration.asDays()) });
	items.push({ timeUnit: 'h', value: duration.hours() });
	items.push({ timeUnit: 'm', value: duration.minutes() });
	items.push({ timeUnit: 's', value: duration.seconds() });

	const formattedItems = items.reduce((accumulator, { value, timeUnit }) => {
		if (accumulator.length >= maxPrecission || (accumulator.length === 0 && value === 0)) {
			return accumulator;
		}

		accumulator.push(`${value}${timeUnit}`);
		return accumulator;
	}, []);

	return formattedItems.length > 0 ? formattedItems.join(' ') : '-';
}
const capitalize = (text, username = false) => {
	if (!username) text = text?.toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ');
	const array = text?.split(' ');
	for (let index = 0; index < array?.length; index++) {
		array[index] = array[index][0]?.toUpperCase() + array[index]?.slice(1);
	}
	return array?.join(' ');
};
const minecraftToDiscord = (string_) => {
	return string_
		.replaceAll(/§./g, '')
		.replaceAll(/&./g, '')
		.replaceAll(/#[\da-f]{8}|#[\da-f]{6}|#[\da-f]{4}|#[\da-f]{3}/gi, '');
};
const util = require('node:util');

// Convert fs.readFile into Promise version of same
const readFile = util.promisify(fs.readFile);
const { success: sass } = require('../sass.json');
const { Punishment } = require('../model/Punishment');
/**
 *
 * @param message
 */
function debugLine(message) {
	let e = new Error();
	let frame = e.stack.split('\n')[2]; // change to 3 for grandparent func
	let lineNumber = frame.split(':').reverse()[1];
	let functionName = frame.split(' ')[5];
	return `${functionName}:${lineNumber} ${message}`;
}
const PasteGG = require('paste.gg');
const UserNotFoundError = new Error('User not found');
UserNotFoundError.name = 'UserNotFoundError';
// For any interested contributors or maybe new code owners - Don't be afraid to visit https://tydiumcraft.net/api , it has useful APIs for bedrock
module.exports = {
	aliases: ['search', 'lookup'],
	arguments: [
		{
			choices: [
				{
					name: 'Java',
					value: 'Java',
				},
				{
					name: 'Bedrock',
					value: 'Bedrock',
				},
			],
			description: 'Platform to search on',
			name: 'platform',
			required: true,
			type: 'string',
		},
		{
			description: "Enter Player's username to search",
			name: 'username',
			required: true,
			type: 'string',
		},
	],
	description: "Review a player's history..",
	// Array of guild IDs that this command can be run in.
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
	execute: async function (message, arguments_, client, flags, parsedArguments) {
		let pasteLink;
		const player = {};
		const pasteGG = new PasteGG(client.config.pasteGGKey);
		const options = {
			'content-type': 'application/x-www-form-urlencoded',
			headers: {
				Token: client.config.restAPIKey,
			},
			validateStatus: (status) => true,
		};
		const placeholderEndpoint = `${client.config.restAPIURL}/v1/placeholders/replace`;

		/**
		 *
		 * @param placeholder
		 * @param uuid
		 */
		async function getPlaceholder(placeholder, uuid) {
			const { data, statusText } = await axios(placeholderEndpoint, {
				data: qs.stringify({
					message: placeholder,
					uuid,
				}),
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
				},
				method: 'POST',
				validateStatus: (status) => true,
			});
			if (statusText !== 'OK') return data;
			if (typeof data !== 'string') return data;
			return data;
		}

		/**
		 *
		 * @param placeholders
		 * @param uuid
		 */
		async function getPlaceholders(placeholders, uuid) {
			const { data, statusText, request } = await axios(placeholderEndpoint, {
				data: qs.stringify({
					message: placeholders.join('|'),
					uuid,
				}),
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
				},
				method: 'POST',
				validateStatus: (status) => true,
			});

			if (statusText !== 'OK') return data;
			if (typeof data !== 'string') return data;
			return data.split('|');
		}

		let shouldContinueRunning = true;
		const runningAsInteraction = message instanceof Discord.BaseInteraction;
		const debugMessages = [];
		let lastMessage;
		/**
		 * @param {any} whatever Message class
		 */
		let send = (whatever) => {
			if (typeof whatever === 'string' && whatever.includes('never played')) sftp.end().catch(() => null);
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

		/**
		 *
		 * @param error
		 */
		function logError(error) {
			if (error.response) {
				// The request was made and the server responded with a status code
				// that falls out of the range of 2xx
				console.error(error.response.data);
				console.error(error.response.status);
				console.error(error.response.headers);
			} else if (error.request) {
				// The request was made but no response was received
				// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
				// http.ClientRequest in node.js
				console.error(error.request.data);
			} else {
				// Something happened in setting up the request that triggered an Error
				console.error('Error', error.message);
			}
			console.error(error.config);
		}

		let apiResponse;

		/**
		 *
		 * @param platform
		 * @param id
		 */
		async function getUserData(platform = 'Java', id) {
			let request;
			if (runningAsInteraction) {
				message.deferReply();
				send = (whatever) => {
					if (runningAsInteraction) {
						message
							.editReply(whatever)
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
			} else {
				message.channel.sendTyping();
			}
			if (!id) throw new TypeError('Id parameter is REQUIRED.');
			if (platform == 'Java') {
				request = await axios.get(`https://playerdb.co/api/player/minecraft/${id}`, {
					validateStatus: (status) => status === 200 || 404,
				});
				debugMessages.push(request.data, id);
				if (!request || !request?.data || !request?.data?.data?.player?.username)
					return send('The specified user could not found or there was an error.');

				apiResponse = request.data.data.player;
				apiResponse.name = apiResponse.username;
				player.platform = capitalize(parsedArguments[0]);
				parsedArguments[1] = apiResponse.username;
			} else if (platform == 'Bedrock') {
				debugMessages.push('ID before modification, probably', id);
				id = id.replace(/./, '').replace(/_/, ' ').trim(); // safety
				if (id.startsWith('00000000-0000-0000-000')) {
					id = Number.parseInt(id.replace(/00000000-0000-0000-000/, '').replace(/-/, ''), 16).toString();
				}
				if (id.startsWith('000000-0000-0000-000')) {
					id = Number.parseInt(id.replace(/000000-0000-0000-000/, '').replace(/-/, ''), 16).toString();
				}
				debugMessages.push('id after modification:', id);
				request = await axios.get(`https://playerdb.co/api/player/xbox/${id}`, {
					validateStatus: (status) => status === 200 || 404,
				});
				debugMessages.push(request.config.url, request.data);
				if (!request || !request?.data || !request?.data?.data?.player?.username)
					return send('The specified user could not found on Xbox or there was an error.');
				apiResponse = request.data.data.player;
				apiResponse.name = `.${apiResponse.username.replace(/ /, '_')}`;
				player.platform = capitalize(parsedArguments[0]);
				parsedArguments[1] = `.${apiResponse.username.replace(/ /, '_')}`;
			} else {
				throw new TypeError(`Not a proper platform given: ${platform}`);
			}
			return apiResponse;
		}

		const punishmentRepo = client.db.getRepository(Punishment);
		const currentPunishedRepo = client.db.getRepository('Punishments');
		const UserSettings = client.db2.getRepository('UserSettings');

		player.platform = capitalize(parsedArguments[0]);
		if (!parsedArguments[0]) {
			const linkedAccount = await client.DatabaseManager.getLinkedAccount(message.author.id);
			if (linkedAccount) {
				parsedArguments[0] = linkedAccount.uuid.startsWith('00000000-0000-0000-000') ? 'Bedrock' : 'Java';
				player.platform = parsedArguments[0];
				parsedArguments[1] = linkedAccount.uuid;
				player.discord = linkedAccount;
			} else {
				return send(
					"There's no linked account related to this user, perhaps they have yet to run `/discord link` in-game?",
				);
			}
		}
		if (!this.arguments[0]?.choices.map((x) => x.name).includes(player.platform) && !apiResponse) {
			switch (true) {
				case /\d{17,23}/.test(parsedArguments[0]):
				case /<@!*&*\d+>/.test(parsedArguments[0]): {
					debugMessages.push('MENTION/ID DETECTED');
					const id = parsedArguments[0]
						.replaceAll(/^<@([^>]+)>$/gim, '$1')
						.replace(/!/, '')
						.trim();
					debugMessages.push('ID GIVEN: ', id);
					const user = await client.users.fetch(id).catch(() => null);
					if (user) {
						const linkedAccount = await client.DatabaseManager.getLinkedAccount(id);
						if (linkedAccount?.discord) {
							player.platform = linkedAccount.uuid.startsWith('00000000-0000-0000-000') ? 'Bedrock' : 'Java';
							parsedArguments[0] = player.platform;
							parsedArguments[1] = linkedAccount.uuid;
							player.discord = linkedAccount;
						} else
							return send(
								"There's no linked account related to this user, perhaps they have yet to run `/discord link` in-game?",
							);
					} else if (!apiResponse)
						return send(
							"I understood you wanted to search the history of a player, but they don't seem to exist on Discord!",
						);
					break;
				}
				case parsedArguments[0]?.startsWith('.'): {
					debugMessages.push('BEDROCK USER SEARCH DETECTED', 'USERNAME GIVEN: ', parsedArguments[0]);
					parsedArguments[1] = parsedArguments[0];
					player.platform = 'Bedrock';
					parsedArguments[0] = player.platform;
					break;
				}
				case /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(parsedArguments[0]):
				case parsedArguments[0]?.startsWith('00000000-0000-0000'): {
					debugMessages.push('UUID USER SEARCH DETECTED', 'UUID GIVEN: ', parsedArguments[0]);
					parsedArguments[1] = parsedArguments[0];
					player.platform = parsedArguments[1].startsWith('00000000-0000-0000') ? 'Bedrock' : 'Java';
					parsedArguments[0] = player.platform;
					break;
				}
				case /^.{3,32}#\d{4}$/.test(parsedArguments[0]): {
					debugMessages.push('USER TAG SEARCH DETECTED', 'USER TAG GIVEN: ', parsedArguments[0]);
					const members = await message.guild.members.fetch({
						cache: true,
					});
					let member = members.find((m) => m.user.tag == parsedArguments[0]);
					if (!member)
						member = members.find((m) => m.user.tag.toLowerCase().trim() == parsedArguments[0].toLowerCase().trim());
					if (!member) return send('No Discord member could be found with that Discord tag in this guild!');
					const linkedAccount = await client.DatabaseManager.getLinkedAccount(member.id);
					if (!linkedAccount?.discord)
						return send(
							"There's no linked account related to this user, perhaps they have yet to run `/discord link` in-game?",
						);
					player.discord = linkedAccount;
					player.platform = linkedAccount.uuid.startsWith('00000000-0000-0000-000') ? 'Bedrock' : 'Java';
					parsedArguments[0] = player.platform;
					parsedArguments[1] = linkedAccount.uuid;
					break;
				}
				case /^\w{2,16}$/gm.test(parsedArguments[0]): {
					debugMessages.push('Java User SEARCH DETECTED', 'Java User Given: ', parsedArguments[0]);
					parsedArguments[1] = parsedArguments[0];
					player.platform = 'Java';
					parsedArguments[0] = player.platform;
					break;
				}
				default: {
					if (!this.arguments[0]?.choices.map((x) => x.name).includes(player.platform)) {
						debugMessages.push(
							player.platform,
							this.arguments[0]?.choices.map((x) => x.name).includes(player.platform),
						);
						return send({
							embeds: [
								new Discord.EmbedBuilder()
									.setTitle(':x: | Incorrect Command Usage')
									.setDescription(
										`You need to specify whether or not you want to search on \`Java\` or \`Bedrock\`\n**Example**: ${
											runningAsInteraction ? '/' : client.config.prefix
										}history Java Romvnly`,
									),
							],
						});
					}
					break;
				}
			}
		}
		if (!apiResponse && parsedArguments[1]?.match(/<@!*&*\d+>/)) {
			debugMessages.push('MENTION DETECTED');
			const id = parsedArguments[0]
				?.replace(/^<@([^>]+)>$/gim, '$1')
				.replace(/!/, '')
				.trim();
			debugMessages.push('ID GIVEN: ', id);
			const user = await client.users.fetch(id).catch(() => null);
			if (user) {
				const linkedAccount = await client.DatabaseManager.getLinkedAccount(id);
				if (linkedAccount?.discord) {
					parsedArguments[0] = linkedAccount.uuid.startsWith('00000000-0000-0000-000') ? 'Bedrock' : 'Java';
					parsedArguments[1] = linkedAccount.uuid;
					player.discord = linkedAccount;
					await getUserData(
						linkedAccount.uuid.startsWith('00000000-0000-0000-000') ? 'Bedrock' : 'Java',
						linkedAccount.uuid,
					);
				}
			} else if (!apiResponse && !user)
				return send(
					"There's no linked account related to this user, perhaps they have yet to run `/discord link` in-game?",
				);
		}
		const tomorrow = client.utils.whatIsTomorrow();

		if (!parsedArguments[1]) {
			return send({
				embeds: [
					new Discord.EmbedBuilder()
						.setTitle(':x: | Incorrect Command Usage')
						.setDescription(
							`You need to specify a username\n**Example**: ${
								runningAsInteraction ? '/' : client.config.prefix
							}history Java Romvnly`,
						),
				],
			});
		}
		if (!parsedArguments[1]?.startsWith('.') && player.platform === 'Bedrock')
			parsedArguments[1] = `.${parsedArguments[1]?.replace(/ /, '_')}`;

		const isUUID = apiResponse
			? true
			: parsedArguments[1]?.match(/^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
		let usernameFormat;
		if (player.platform === 'Java') usernameFormat = /^\w{1,16}$/i;
		if (player.platform === 'Bedrock') {
			usernameFormat = parsedArguments[1].includes('#') ? /^.{3,23}#\d{4}$/ : /^.{3,23}[\dA-Za-z]+([ _-]?[\dA-Za-z])*$/;
		}
		if (!parsedArguments[1]?.match(usernameFormat) && !isUUID) return send("That's not a valid username!~!!!! SOTP!");
		if (parsedArguments[1]?.split('.').length > 2)
			return send("That's not a valid username!~!!!! ARE U TRYING TO DO A EXPLOIT???");
		if (!apiResponse) await getUserData(player.platform, parsedArguments[1]);

		try {
			const otherOptions = {
				agent: process.env.SSH_AUTH_SOCK,
				debug: (e) => debugMessages.push(e),
			};
			const optionsWithExtra = {
				...client.config.sshLogin,
				...otherOptions,
			};
			await sftp.connect(optionsWithExtra);
		} catch (error) {
			console.error(error);
			if (error.message.includes('already defined')) {
				await sftp.end();
				return send(
					"The previous command I handled didn't exit properly. Please run this command again, it will work. I PROMISE",
				);
			} else if (!error instanceof TypeError)
				return send('Oh dang it! I ran into a stupid error. Perhaps The Whole Easy SMP Network is down?');
		}
		try {
			if (!apiResponse) return;
			const bedrockGamertag = apiResponse.username;
			debugMessages.push(apiResponse);
			player.name = apiResponse.name;
			if (player.platform === 'Java') player.uuid = apiResponse.id;
			if (player.platform === 'Bedrock') player.xbox = apiResponse.meta;
			// TownyAdvanced data logic (FLAT DATA ONLY)
			const playerPath = path.join(
				client.config.sshLogin.minecraftServerPath,
				'plugins/Towny/data/residents/',
				`${player.name}.txt`,
			);
			const localPlayerPath = path.join(client.tempDir, `${player.name}.txt`);
			const townyFileExists = await sftp.exists(playerPath);
			if (!townyFileExists)
				return send("There was no towny playerdata found for this player, perhaps they've never played on Easy SMP?");
			await sftp.fastGet(playerPath, localPlayerPath);
			const playerFile = await readFile(localPlayerPath, 'utf-8');
			fs.unlinkSync(localPlayerPath);
			const playerProperties = properties.parse(playerFile);
			if (!playerProperties) return send('Failed to parse player data!!! WEEWOWOOOo');
			if (player.platform === 'Bedrock' && !player.uuid) {
				player.uuid = playerProperties.uuid;
			}
			player.isNPC = playerProperties.isNPC;
			if (player.isNPC) return send('This player is a RESERVED NPC!');
			player.punishmentHistory = await punishmentRepo.find({
				name: player.name,
			});
			if (player.punishmentHistory?.length) {
				pasteLink = await pasteGG.post({
					description: `Easy SMP » Punishment History for ${player.name}`, // Optional
					expires: tomorrow, // Optional (must be a UTC ISO 8601 string)
					files: [
						{
							// Optional
							content: {
								format: 'text',
								value: player.punishmentHistory
									.map(
										(x) =>
											`${capitalize(x.punishmentType)} for ${
												x.reason ? minecraftToDiscord(x.reason) : 'N/A'
											} [DURATION: ${
												x?.end?.length && x?.end !== '-1' ? durationAsString(x?.end - x?.start) : 'PERM'
											}, STAFF: ${x.operator == 'CONSOLE' ? 'PAMA' : x.operator}, ID: ${x.id}]`,
									)
									.join('\n'),
							},
							name: 'history.txt',
						},
					],
				});
				if (pasteLink.status !== 'success')
					console.error(`Failed to upload paste.gg link for ${player.name} (${player.platform})`, player);
			}
			if (!player?.discord) player.discord = await client.DatabaseManager.getLinkedAccount(player.uuid);
			debugMessages.push(player.discord);

			if (player.discord?.discord)
				player.discord.user = await client.users.fetch(player.discord?.discord).catch(() => null);
			// Essentials data logic
			const remoteEssentialsPath = path.join(
				client.config.sshLogin.minecraftServerPath,
				'plugins/Essentials/userdata/',
				`${player.uuid}.yml`,
			);
			const essentialsFileExists = await sftp.exists(remoteEssentialsPath);
			if (!essentialsFileExists)
				return send("There was no Essentials data found for this player, perhaps they've never played on Easy SMP?");
			const localEssentialsPath = path.join(client.tempDir, `${player.name}.yml`);
			await sftp.fastGet(remoteEssentialsPath, localEssentialsPath);
			const essentialsFile = await readFile(localEssentialsPath);
			fs.unlinkSync(localEssentialsPath);
			const essentialsData = yaml.load(essentialsFile);
			player.lastOnline = playerProperties.lastOnline ? moment(playerProperties.lastOnline).fromNow() : null;
			player.creation = playerProperties.registered ? moment(playerProperties.registered).fromNow() : null;
			player.friends = playerProperties?.friends?.split(',') || [];
			player.town = {
				exists: !!playerProperties.town,
				id: removeFormatting(playerProperties.town),
				joinedAt: playerProperties.joinedTownAt ? moment(playerProperties.joinedTownAt).fromNow() : null,
				name: removeFormatting(playerProperties.town),
				ranks: playerProperties['town-ranks'],
			};
			if (player.town.exists) {
				// TownyAdvanced data logic (FLAT DATA ONLY)
				const townPath = path.join(
					client.config.sshLogin.minecraftServerPath,
					'plugins/Towny/data/towns/',
					`${player.town.name}.txt`,
				);
				const localTownPath = path.join(client.tempDir, `${player.name}-${player.town.name}.txt`);
				const townyFileExists = await sftp.exists(townPath);
				if (!townPath) return send('There was no towny data found for this town... Catastrophic failure');
				await sftp.fastGet(townPath, localTownPath);
				const townFile = await readFile(localTownPath, 'utf-8');
				fs.unlinkSync(localTownPath);
				const townProperties = properties.parse(townFile);
				if (!townProperties) return send('Failed to parse town data!!! WEEWOWOOOo');
				// I feel like this is a bit cursed.
				player.town = {
					...player.town,
					...townProperties,
				};
			}
			const [town, ranks, namePrefix, online] = await getPlaceholders(
				['%townyadvanced_town%', '%townyadvanced_town_ranks%', '%townyadvanced_towny_name_prefix%', '%player_online%'],
				player.uuid,
			).catch((error) => {
				if (error.message.includes('ECONNREFUSED') || error.message.includes('TIME'))
					return send(
						":bangbang: | I **failed** to establish a connection to the Minecraft server's REST API. Please try again later.",
					);
				shouldContinueRunning = false;
			});
			if (town) player.town.name = minecraftToDiscord(town);
			if (ranks) player.town.ranks = [minecraftToDiscord(ranks)];
			player.towny = {
				surname: playerProperties.surname,
				title: playerProperties.title,
			};
			if (namePrefix) player.towny.prefix = minecraftToDiscord(namePrefix);
			player.balance = Number(essentialsData.money);
			let isVanished = false;
			if (player.online) isVanished = (await getPlaceholder('%vanish_vanished%', player.uuid)) !== 'true';
			player.online = online === 'yes' && !isVanished;
			if (player.online) {
				const [advancementProgress, advancementsToBeCompleted] = await getPlaceholders(
					['%Advancements_completedAmount%', '%Advancements_remainingAmount%'],
					player.uuid,
				);
				player.advancements = {
					percentage: `${(advancementProgress / advancementsToBeCompleted) * 100}%`,
					progress: advancementProgress,
					toBeCompleted: advancementsToBeCompleted,
				};
			}
			player.metadata = {
				acceptingPay: essentialsData['accepting-pay'] === undefined ? true : essentialsData['accepting-pay'],
				afk: essentialsData.afk ? essentialsData.afk : false,
				godmode: essentialsData.godmode === undefined ? false : essentialsData.godmode,
				jailed: essentialsData.jailed === undefined ? false : essentialsData.jailed,
				onlineFor: player.online ? durationAsString(Date.now() - essentialsData.timestamps.login) : null,
			};
			if (!player.metadata.afk) {
				player.metadata.afk = (await getPlaceholder('%plan_player_is_afk%', player.uuid)) === 'yes';
			}
			// https://help.minecraft.net/hc/en-us/articles/8969841895693
			// This feature will NEVER work like it used to 2 years ago. Thanks, Mojang! ❤️
			// https://cdn.arstechnica.net/wp-content/uploads/2012/06/torvaldsnvidia-640x424.jpg
			const nameHistory =
				player.platform === 'Java'
					? apiResponse.meta.name_history
					: [
							{
								name: 'Java only feature!',
							},
					  ];
			player.nameHistory =
				nameHistory?.map((x) => `${x.name}${x.changedToAt ? ` (${moment(x.changedToAt).fromNow()})` : ''}`) || [];
			const userSetting = await UserSettings.findOneBy({
				uuid: player.uuid,
			});
			player.ranks = ((await getPlaceholder('%luckperms_groups%', player.uuid)) || '').split(', ').filter(Boolean);
			if (player.ranks.length === 0) player.ranks = undefined;
			player.description = userSetting?.description || 'The Edge Lord';
			try {
				const remoteBannedPlayersPath = path.join(client.config.sshLogin.minecraftServerPath, 'banned-players.json');
				const localBannedPlayers = path.join(client.tempDir, 'banned-players.json');
				await sftp.fastGet(remoteBannedPlayersPath, localBannedPlayers);
				const bannedPlayers = JSON.parse(await readFile(localBannedPlayers, 'utf-8'));
				player.banned = bannedPlayers.find((x) => x.uuid == player.uuid) || false;
				fs.unlinkSync(localBannedPlayers);
			} catch (error) {
				console.error(error);
				send(":warning: | Something went wrong with getting the user's banned state");
			}
			if (!player.banned) {
				const currentlyPunished = await currentPunishedRepo
					.findOneBy({
						uuid: player.uuid.replaceAll('-', ''),
					})
					.catch(() => null);
				if (currentlyPunished) {
					player.banned = {
						created: Number(currentlyPunished.start),
						expires: currentlyPunished.end > 1 ? Number(currentlyPunished.end) : undefined,
						name: player.name,
						punishmentType: currentlyPunished.punishmentType,
						reason: currentlyPunished.reason,
						source: currentlyPunished.operator,
						uuid: player.uuid,
					};
				}
			}
			// const NBTPath = path.join("/home/mcuser/minecraft/world/playerdata", player.uuid + '.dat')
			// const localNBTPath = path.join(client.tempDir, player.uuid + '.dat');
			// await sftp.fastGet(NBTPath, localNBTPath)
			// const NBTFile = await readFile(localNBTPath);
			// var NBTProperties;
			// nbt.read(NBTFile, function (error, nbt) {
			//     if (error) throw error;
			//     NBTProperties = JSON.parse(JSON.stringify(nbt))
			//      // player.creation = NBTProperties.bukkit.firstPlayed? moment(NBTProperties.bukkit.firstPlayed.substring(0, NBTProperties.bukkit.firstPlayed.length - 1)).fromNow() : null
			// })
			// fs.unlinkSync(localNBTPath)
		} catch (error) {
			sftp
				.end()
				.then(() => null)
				.catch(() => null);
			console.error(error);
			if (!error instanceof TypeError)
				return send('Oh dang it! I ran into a stupid error. Perhaps The Whole Easy SMP Network is down?');
			else if (shouldContinueRunning) {
				return;
			} else {
				return send('There is a error in our code! Contact the bot devs!');
			}
		}
		sftp
			.end()
			.then(() => null)
			.catch(() => null);
		const filter = (index) => index.user.id === message.author.id;
		const collector = message.channel.createMessageComponentCollector({ filter, time: 300_000 });
		const row = new Discord.ActionRowBuilder().addComponents(
			new Discord.ButtonBuilder().setCustomId('stalkeranalytics').setLabel('Stalker Analytics').setStyle('Primary'),
			new Discord.ButtonBuilder().setCustomId('vote').setLabel('Voting Info').setStyle('Success'),
		);
		// Jobs Placeholders don't work for players that aren't online
		if (player.online)
			row.addComponents(new Discord.ButtonBuilder().setCustomId('jobs').setLabel('Job Info').setStyle('Danger'));
		/**
		 * @param {Discord.ButtonInteraction} i
		 */
		collector.on('collect', async (index) => {
			if (index.customId === 'bedrock') {
				// change values
				await handleEmbed();
			}
			if (index.customId === 'java') {
				// change values
				await handleEmbed();
			}
			if (index.customId === 'stalkeranalytics') {
				// change values
				await sendStalkerAnalytics(index);
			}
			if (index.customId === 'vote') {
				// change values
				await sendVotingInfo(index);
			}
			if (index.customId === 'jobs') {
				// change values
				await sendJobsInfo(index);
			}
		});
		if (player && player?.name && shouldContinueRunning) await handleEmbed();

		/**
		 * @param {Discord.ButtonInteraction} i
		 * @param index
		 */
		async function sendStalkerAnalytics(index) {
			const [
				averagePingThisMonth,
				sessionCount,
				timeActive,
				timeAFK,
				timeTotal,
				activityIndex,
				activityGroup,
				playerKillCount,
				mobKillCount,
				deaths,
				kdr,
			] = await getPlaceholders(
				[
					'%plan_player_ping_average_month%',
					'%plan_player_sessions_count%',
					'%plan_player_time_active_raw%',
					'%plan_player_time_afk_raw%',
					'%plan_player_time_total_raw%',
					'%plan_player_activity_index%',
					'%plan_player_activity_group%',
					'%plan_player_player_kill_count%',
					'%plan_player_mob_kill_count%',
					'%plan_player_deaths%',
					'%plan_player_kdr%',
				],
				player.uuid,
			);
			player.plan = {};
			if (sessionCount) player.plan.sessionCount = Number(sessionCount);
			else {
				logError(sessionCount);
				return send(':warning: | Failed to retrieve sessionCount from our Rest API.');
			}
			row.components[0].setDisabled(true); //disables but_1
			index.update({ components: [row] });
			index.channel.send({
				embeds: [
					new Discord.EmbedBuilder()
						.setTitle('Player Analytics')
						.setDescription(
							`
                        Average Ping: ${averagePingThisMonth}
                        Session Count: ${player.plan.sessionCount}
                        Total Playtime: ${durationAsString(timeTotal)}
                        Time Active: ${durationAsString(timeActive)}
                        Time AFK: ${durationAsString(timeAFK)}
                        Activity Index: ${Number(activityIndex | 0).toFixed(2)} (${activityGroup})
                        
                        Player Kill Count: ${playerKillCount}
                        Mob Kill Count: ${mobKillCount}
                        Deaths: ${deaths}
                        KDR: ${Number(kdr).toFixed(2)}`,
						)
						.setColor(Discord.Colors.Green)
						.setImage(
							'https://camo.githubusercontent.com/e8537205e9ea89bd8c1d012035a9427e997c6a8f5ab105f5eac54f8aca5424bf/68747470733a2f2f7075752e73682f41585367372f356632663738633036632e6a7067',
						),
				],
			});
		}

		/**
		 *
		 * @param index
		 */
		async function sendVotingInfo(index) {
			row.components[1].setDisabled(true); //disables but_1
			index.update({ components: [row] });
			const [
				canVote,
				votePoints,
				totalVotes,
				totalVotesThisMonth,
				voteLeaderboardPosition,
				dailyVotingStreak,
				weeklyVotingStreak,
				monthlyVotingStreak,
			] = await getPlaceholders(
				[
					'%VotingPlugin_CanVote%',
					'%VotingPlugin_Points%',
					'%VotingPlugin_Total_AllTime%',
					'%VotingPlugin_Total_Monthly%',
					'%VotingPlugin_top_month_position%',
					'%VotingPlugin_DailyVoteStreak%',
					'%VotingPlugin_WeeklyVoteStreak%',
					'%VotingPlugin_MonthVoteStreak%',
				],
				player.uuid,
			);

			/**
			 *
			 * @param string
			 */
			function stringToBoolean(string) {
				switch (string.toLowerCase().trim()) {
					case 'true':
					case 'yes':
					case '1': {
						return true;
					}

					case 'false':
					case 'no':
					case '0':
					case null: {
						return false;
					}

					default: {
						return Boolean(string);
					}
				}
			}

			index.channel.send({
				embeds: [
					new Discord.EmbedBuilder()
						.setTitle('Voting Stats')
						.setColor(Discord.Colors.Green)
						.setImage('https://i.imgur.com/V92BaS2.png').setDescription(`
                    Voted: ${stringToBoolean(canVote) ? 'No' : 'Yes'}
                    Vote Points: ${votePoints}
                    Lifetime Votes: ${totalVotes}
                    Votes this month: ${totalVotesThisMonth}

                    Leaderboard Position: ${voteLeaderboardPosition || 'N/A'}

                    Voting Streak (Daily): ${dailyVotingStreak}
                    Voting Streak (Weekly): ${weeklyVotingStreak}
                    Voting Streak (Monthly): ${monthlyVotingStreak}
                    `),
				],
			});
		}

		/**
		 *
		 * @param index
		 */
		async function sendJobsInfo(index) {
			row.components[2].setDisabled(true); //disables but_1
			index.update({ components: [row] });
			const [jobCount, maxJobs, jobPoints, lifetimeJobPoints, jobs] = await getPlaceholders(
				[
					'%jobsr_user_joinedjobcount%',
					'%jobsr_maxjobs%',
					'%jobsr_user_points%',
					'%jobsr_user_total_points%',
					'%jobsr_user_jobs%',
				],
				player.uuid,
			);
			const getJobLevel = async (job) => await getPlaceholder(`%jobsr_user_jlevel_${job}%`, player.uuid);
			const properJobs = jobs.split(/[ ,]+/).map((x) => minecraftToDiscord(x));
			const jobLevelsAndNames = await Promise.all(
				properJobs.map(async (x) => `${x} [Level: ${await getJobLevel(x.toLowerCase())}]`),
			);
			console.log(await getJobLevel('builder'), properJobs, jobLevelsAndNames);
			index.channel.send({
				embeds: [
					new Discord.EmbedBuilder()
						.setTitle('Steve Jobs')
						.setColor(Discord.Colors.DarkRed)
						.setImage(
							'https://camo.githubusercontent.com/a5cba6dca85527f5852304bf436dc4d531d53fcd006d0eadb26733c4c7716431/68747470733a2f2f7777772e737069676f746d632e6f72672f646174612f7265736f757263655f69636f6e732f342f343231362e6a70673f31343234343633373639',
						).setDescription(`
                    Jobs: ${jobCount} / ${maxJobs}
                    Job Points: ${jobPoints}
                    Lifetime Job Points: ${lifetimeJobPoints}
                    Job Info:
                    - ${jobLevelsAndNames.join('\n-')}
                    `),
				],
			});
		}

		/**
		 *
		 */
		async function handleEmbed() {
			const historyEmbed = new Discord.EmbedBuilder();
			const options_ = {
				components: [row],
				embeds: [
					historyEmbed
						.setTitle(
							player.platform === 'Bedrock'
								? `${player.name}${player.xbox.realName.length > 0 ? ` (${player.xbox.realName})` : ''}`
								: `${player.towny.prefix || ''}${player?.name}` || 'Unknown Player',
						)
						.setURL(
							player.platform === 'Bedrock'
								? encodeURI(`https://xboxgamertag.com/search/${apiResponse.username}`)
								: `https://namemc.com/profile/${player.uuid}`,
						)
						.setDescription(
							`
            **Title**: ${player.towny.title || 'None, they have no swags'} 
            **Surname**: ${player.towny.surname || 'None'}
            **Description**: ${
							player.xbox && player.description === 'The Edge Lord' ? player.xbox.bio : player.description
						}
            **Platform**: ${player?.platform || 'Unknown'}${
							player.xbox
								? `
            **Gamerscore**: ${Number(player.xbox.gamerscore).toLocaleString()}
            **Location**: ${player.xbox.location || 'Easy SMP'}`
								: ''
						}
            **Balance**: ${
							Math.round(player.balance).toLocaleString() || 'Literally nothing, I wonder how it feels to be poor!'
						}
            **Registered**: ${player?.creation || 'Unknown'}
            ${
							player.online
								? `**Online**: Yes, has been online for ${player.metadata.onlineFor} (${
										player.metadata.afk ? 'AFK' : 'NOT AFK'
								  })`
								: `**Last Online**: ${player?.lastOnline || 'Unknown'}`
						}
            ${
							player?.nameHistory && player?.nameHistory[0]
								? `
            **Past usernames**: ${player.nameHistory.join(', ')}
            `
								: ''
						}${
							player.online
								? `\n- **Advancements**: ${player.advancements.progress}
            - **Advancements to be Completed**: ${player.advancements.toBeCompleted}\n`
								: ''
						}
            **Linked Account**: ${player.discord?.user ? player.discord.user.tag : 'None'}
            **Infractions**: ${
							player.punishmentHistory.filter((x) => x.punishmentType !== 'TEMP_WARNING')?.length
								? `${player.punishmentHistory.filter((x) => x.punishmentType !== 'TEMP_WARNING')?.length + 1} (${
										pasteLink?.result?.url ? pasteLink?.result?.url : 'Error?'
								  })`
								: '0'
						}
            **Banned**: ${player?.banned ? 'Yes' : 'No'} ${
							player.banned
								? `\n- Reason: ${player.banned.reason}\n- Banned on: ${prettyPrint(
										new Date(player.banned.created),
								  )}\n- Expires: ${
										player.banned.expires ? relativeTime(new Date(player.banned.expires)) : 'Probably never.'
								  }\n`
								: ''
						}
            ${player.ranks ? `**Ranks**: ${capitalize(player.ranks.join(', '))}` : ''}
            ${console.log(player)}
            **Friends**: 
            # ${(player?.friends && player?.friends[0]) || 'Has no friends, typical.'}
            **Town**:
                👥 **Name**: ${player?.town?.id || 'None'}
                👥 **Ranks**: ${player?.town?.exists ? player.town?.ranks?.join(', ') || 'Resident' : 'Nomad'}
                👥 **Joined**: ${
									player?.town?.joinedAt
										? player.town.joinedAt
										: player?.town?.exists
										? 'Unknown, perhaps they joined this town before this feature was added?'
										: 'trashy nomad L'
								}
            `,
						)
						.setThumbnail(`https://api.tydiumcraft.net/skin?uuid=${player?.uuid}&direction=left`)
						.setColor(Discord.Colors.DarkVividPink)
						.setFooter({
							text: `One of the thousands of players Easy SMP has processed.`,
						}),
				],
			};
			options_.content = sass.random();
			send(options_);
		}
	},

	guildOnly: false,

	name: 'history',

	nsfwOnly: false,

	ownerOnly: false,

	specialGuilds: null,
};
