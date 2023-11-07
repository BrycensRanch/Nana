const Discord = require('discord.js');
const fs = require('node:fs/promises');
const path = require('node:path');
const escapeRegex = (string_ = '') => string_.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&');
const { SlashCommandBuilder } = require('discord.js');

/** Top donkey command handler class */
class CommandHandler extends EventTarget {
	/**
	 * Top donkey command handler
	 * @param {object} client - The discord.js this.client instance to run on.
	 * @param {string} botPrefix - The prefix of the bot.
	 * @param {string} commandsDirectory - The directory where all the commands are located.
	 * @param {string} eventsDirectory - The directory where all the events are located.
	 */
	constructor(client, botPrefix = '!', commandsDirectory = './commands', eventsDirectory = './events') {
		super();
		this.client = client;
		this.commandsDir = commandsDirectory;
		this.eventsDir = eventsDirectory;
		this.botPrefix = botPrefix;
		if (!client) throw new TypeError('No discord.js client provided!');
		if (typeof client !== 'object') throw new TypeError('The discord.js client must be an class/object.');
		if (!client instanceof Discord.Client) {
			throw new TypeError('The supplied client is not an instance of Discord.client.');
		}
		if (!commandsDirectory) throw new TypeError('No commands directory provided!');
		if (typeof commandsDirectory !== 'string') throw new TypeError('The commands Directory must be a string.');
		if (!eventsDirectory) throw new TypeError('No events directory provided!');
		if (typeof eventsDirectory !== 'string') throw new TypeError('The events Directory must be a string.');
		if (!client.commands || !client.commands instanceof Discord.Collection) client.commands = new Discord.Collection();
		if (!client.aliases || !client.aliases instanceof Discord.Collection) client.aliases = new Discord.Collection();
		if (!client.botAdmins || !Array.isArray(client.botAdmins)) client.botAdmins = [];
	}
	/**
	 * Resolve a command from a string
	 * @param {string} command - The command to resolve.
	 * @returns {object} command -The command resolved, if any.
	 */
	resolveCommand(command) {
		let cmd;
		cmd = this.client.commands.has(command) ? this.client.commands.get(command) : this.client.aliases.get(command);
		return cmd;
	}
	/**
	 * This function splits spaces and creates an array of object defining both the type of group (based on quotes) and the value (text) of the group.
	 * @param string The string to split.
	 * @see parse
	 */
	parseDetailed(string) {
		const groupsRegex = /[^\s"']+|["']{2,}|"(?!")([^"]*)"|'(?!')([^']*)'|"|'/g;

		const matches = [];

		let match;

		while ((match = groupsRegex.exec(string))) {
			if (match[2]) {
				// Single quoted group
				matches.push({
					type: 'single',
					value: match[2],
				});
			} else if (match[1]) {
				// Double-quoted group
				matches.push({
					type: 'double',
					value: match[1],
				});
			} else {
				// No quote group present
				matches.push({
					type: 'plain',
					value: match[0],
				});
			}
		}

		return matches;
	}
	/**
	 * This function splits spaces and creates an array of strings, like if you were to use `String.split(...)`, but without splitting the spaces in between quotes.
	 * @param string - The string to split.
	 * @see parseDetailed
	 */
	parse(string) {
		return this.parseDetailed(string).map((details) => details.value);
	}
	/**
	 * Handles a command from a message event. (Does not support message edits)
	 * @param {Discord.Message} message
	 * @returns {object} - The command resolved, if any.
	 */
	async handleCommand(message) {
		if (message && message.partial) message = await message.fetch().catch(() => {});
		if (!message) return; // If we're given a partial deleted message, don't do anything with it! It's useless anyway!
		if (message.author.bot === true) return;
		if (message.type !== 'DEFAULT') return; // Only regular user messages.
		if (message.guild && !message.channel.permissionsFor(message.guild.me).serialize().SEND_MESSAGES) return; // If the bot can't send messages to the channel, ignore.
		// If there is any custom guild prefixes, fetch from the database and redefine the botPrefix to their custom prefix for the server.
		const prefixRegex = new RegExp(`^(<@!?${this.client.user.id}>|${escapeRegex(this.botPrefix)})\\s*`);
		if (!prefixRegex.test(message.content)) return;
		// The flags are parsed and also returns back the arguments without the flags in them!
		const [, matchedPrefix] = message.content.match(prefixRegex),
			{ args, flags } = this.parseFlags(message.content.slice(matchedPrefix.length).trim().split(/ +/)),
			command = args.shift().toLowerCase(); // This shouldn't be changed... AT ALL. This is what triggered the command.

		args.executor = command;
		const parsedArguments = this.parse(args.join(' ')); // This allows arguments like 'ARGUMENT WITH SPACES' to be interpreted as one argument.
		try {
			let cmd = this.resolveCommand(command);
			if (!cmd) return;
			if (cmd.ownerOnly && !this.client.botAdmins.includes(message.author.id)) return; // Do not reply to commands such as eval...
			if (cmd.nsfwOnly) {
				const nsfwPrompt = new Discord.EmbedBuilder()
					.setColor(Discord.Colors.Red)
					.setDescription(`The command \`${cmd.name}\` can only be ran in NSFW channels.`)
					.setTimestamp();
				if (message.channel.nsfw === false)
					return message
						.reply(
							`${message.author.toString()}, oh no, this command is exclusive to NSFW channels. ${
								message.channel.permissionsFor(message.member).serialize(false).USE_EXTERNAL_EMOJIS
									? '<:sa_smirk:775582286556692491>'
									: ';)'
							}`,
							nsfwPrompt,
						)
						.catch(() => {});
			}
			if (cmd.guildOnly) {
				const guildOnly = new Discord.EmbedBuilder()
					.setColor('RED')
					.setDescription(`The \`${cmd.name}\` command can only be ran in guilds.`);
				if (!message.guild) return message.reply(`${message.author.toString()},`, guildOnly).catch(() => {});
			}
			if ((cmd.specialGuilds && !message.guild) || (cmd.specialGuilds && !cmd.specialGuilds.includes(message.guild.id)))
				return;
			await cmd
				.execute(message, args, this.client, flags, parsedArguments)
				.catch(async (error) => {
					if (cmd.finally) await cmd.finally(message, args, this.client, flags, parsedArguments);
					throw error || new Error(`Unknown error`);
				})
				.then(async () => {
					if (cmd.finally) await cmd.finally(message, args, this.client, flags, parsedArguments);
				});
		} catch (error) {
			console.error(
				`❌ | There was an error while running the command ${command} (${cmd.filepath || 'Unknown filepath'}).\nUser: ${
					message.author.tag
				} (${message.author.id})\nRan in ${message.guild || 'DMs'}\nArguments: ${args.join(', ')}\n${
					message.guild ? `(${message.guild.id})` : ''
				}`,
			);
			console.error(error);
			return message
				.reply(
					`there was an error trying to execute that command!\n${
						this.client.botAdmins.includes(message.author.id)
							? `Please check the console for further details.`
							: `If this error persistents, contact the developers of this bot.`
					}`,
				)
				.catch(() => null);
		}
	}
	/**
	 * Handles a slash command from interactionCreate event.
	 * @param {Discord.BaseInteraction} interaction
	 * @returns {object} - The command resolved, if any.
	 */
	async handleSlashCommand(interaction) {
		if (!interaction) return;
		if (interaction.user.bot) return;
		if (!interaction.isCommand()) return; // Only regular slash commands.
		const command = interaction.commandName;
		const arguments_ = [];
		try {
			var cmd = this.resolveCommand(command);
			if (!cmd) return;
			if (cmd.ownerOnly && !this.client.botAdmins.includes(interaction.user.id)) return; // Do not reply to commands such as eval...
			if (
				(cmd.specialGuilds && !interaction.guild) ||
				(cmd.specialGuilds && !cmd.specialGuilds.includes(interaction.guild.id))
			)
				return;
			interaction.author = interaction.user;
			interaction.delete = interaction.deleteReply;
			interaction.edit = interaction.editReply;
			interaction.options.data.map((x) => {
				arguments_.push(x.value);
			});
			await cmd
				.execute(interaction, arguments_, this.client, [], arguments_)
				.catch(async (error) => {
					if (cmd.finally) await cmd.finally(interaction, arguments_, this.client, [], arguments_);
					throw error || new Error(`Unknown error`);
				})
				.then(async () => {
					if (cmd.finally) await cmd.finally(interaction, arguments_, this.client, [], arguments_);
				});
		} catch (error) {
			console.error(
				`❌ | There was an error while running the slash command ${command} (${
					cmd.filepath || 'Unknown filepath'
				}).\nUser: ${interaction.user.tag} (${interaction.user.id})\nRan in ${
					interaction.guild || 'DMs'
				}\nArguments: ${arguments_}\n${interaction.guild ? `(${interaction.guild.id})` : ''}`,
			);
			console.error(error);
			return interaction
				.editReply(
					`There was an error trying to execute that slash command!\n${
						this.client.botAdmins.includes(interaction.user.id)
							? `Please check the console for further details.`
							: `If this error persistents, contact the developers of this bot.`
					}`,
				)
				.catch(() => null);
		}
	}
	/**
	 * Handles autocompletion from interactionCreate event.
	 * @param {Discord.BaseInteraction} interaction
	 * @returns {object} - The command resolved, if any.
	 */
	async handleAutocomplete(interaction) {}
	/**
	 * Register commands from a folder
	 * @param {string} directory - The directory to register commands from.
	 */
	async registerCommands(directory = this.commandsDir) {
		const commandFiles = await fs.readdir(path.join(__dirname, directory));
		for (const file of commandFiles) {
			let stat = await fs.lstat(path.join(__dirname, directory, file));
			if (stat.isDirectory())
				// If file is a directory, recursive call recurDir
				this.registerCommands(path.join(directory, file));
			else if (file.endsWith('.js')) {
				try {
					const command = require(path.join(__dirname, directory, file));
					if (!command) {
						console.error(`${file} does not seem to export anything. Ignoring the command.`);
						continue;
					}
					if (!command.name) {
						console.error(`${file} does not export a name. Ignoring the command.`);
						continue;
					}
					if (command.category) command.category = command.category.toLowerCase();
					if (!command.category && path.basename(directory).toLowerCase() !== 'commands')
						command.category = path.basename(directory).toLowerCase();
					if (command.category == 'owner') command.ownerOnly = true;
					command.filepath = path.join(__dirname, directory, file);
					if (command.arguments) {
						const slashy = new SlashCommandBuilder()
							.setName(command.name)
							.setDescription(command.description || 'No description');
						for (let index = 0; index < command.arguments.length; index++) {
							const argument = command.arguments[index];
							if (command.arguments[index]?.type == 'string') {
								slashy.addStringOption((option) =>
									option
										.setName(argument.name)
										.setDescription(argument.description)
										.setRequired(argument.required === undefined ? true : argument.required),
								);
								// if (command.arguments) {
								//     console.log(testingSlashy.options.filter(x => x.name === argument.name)[0])
								// }
							}
						}
						command.slashCommand = true;
						this.client._slashCommands.push(slashy);
					}
					this.client.commands.set(command.name, command);
					for (const alias of command.aliases || []) {
						this.client.aliases.set(alias, command);
					}
				} catch (error) {
					console.error(`❌ | There was an error loading command ${file}:\n`, error);
				}
			}
		}
	}
	/**
	 * Register events from a folder.
	 * @param {string} directory - The directory to register events from.
	 */
	async registerEvents(directory = this.eventsDir) {
		let files = await fs.readdir(path.join(__dirname, directory));
		// Loop through each file.
		for (let file of files) {
			let stat = await fs.lstat(path.join(__dirname, directory, file));
			if (stat.isDirectory())
				// If file is a directory, recursive call recurDir
				this.registerEvents(path.join(directory, file));
			else if (file.endsWith('.js')) {
				let eventName = file.slice(0, Math.max(0, file.indexOf('.js')));
				try {
					let eventModule = require(path.join(__dirname, directory, file));
					if (!eventModule) {
						console.error(`${file} does not seem to export anything. Ignoring the event.`);
						continue;
					}
					if (typeof eventModule !== 'function') {
						console.error(`Expected a function for the event handler... Got ${typeof eventModule}.`);
						continue;
					}
					console.log(`📂 ${directory} | ${eventName} event loaded!`);
					this.client.on(eventName, eventModule.bind(null, this.client));
				} catch (error) {
					console.log(`❌ | There was an error loading event ${file}!`);
					console.error(error);
				}
			}
		}
	}
	/**
	 * Parse flags from a array of strings.
	 * @param {Array} arguments_ - The arguments to parse from.
	 * @returns {object} - The parsed flags & the new arguments.
	 */
	parseFlags(arguments_) {
		const flags = {};
		for (let argument of arguments_) {
			if (argument.startsWith('--')) {
				let flag = argument.slice(2);
				let eq = flag.indexOf('=');
				if (eq == -1) {
					flags[flag.toLowerCase()] = true;
					delete arguments_[arguments_.indexOf(argument)];
				} else {
					flags[flag.slice(0, Math.max(0, eq)).toLowerCase()] = flag.slice(eq + 1);
					delete arguments_[arguments_.indexOf(argument)];
				}
			} else if (argument.startsWith('-') && argument.length > 2) {
				let flag = argument.slice(1);
				let eq = flag.indexOf('=');
				if (eq == -1) {
					flags[flag.toLowerCase()] = true;
					delete arguments_[arguments_.indexOf(argument)];
				} else {
					flags[flag.slice(0, Math.max(0, eq)).toLowerCase()] = flag.slice(eq + 1);
					delete arguments_[arguments_.indexOf(argument)];
				}
			}
		}
		arguments_ = arguments_.filter((element) => {
			return !(element == undefined);
		});
		return {
			args: arguments_,
			flags: flags,
		};
	}
}

module.exports = CommandHandler;
