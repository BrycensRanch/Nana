const EventEmitter = require('events');
const Discord = require('discord.js');
const fs = require("fs")
    .promises;
const path = require("path");
const escapeRegex = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const {
    SlashCommandBuilder
} = require('discord.js');

/** Top donkey command handler class */
class CommandHandler extends EventEmitter {
    /**
     * Top donkey command handler
     * @param {object} client - The discord.js this.client instance to run on.
     * @param {string} botPrefix - The prefix of the bot.
     * @param {string} commandsDir - The directory where all the commands are located.
     * @param {string} eventsDir - The directory where all the events are located.
     */
    constructor(client, botPrefix = '!', commandsDir = './commands', eventsDir = './events') {
        super();
        this.client = client;
        this.commandsDir = commandsDir;
        this.eventsDir = eventsDir;
        this.botPrefix = botPrefix;
        if (!this.client) throw new TypeError('No discord.js this.client provided!');
        if (typeof this.client !== 'object') throw new TypeError('The discord.js this.client must be an class/object.');
        if (!this.client instanceof Discord.Client) throw new TypeError('The supplied this.client is not an instance of Discord.this.client.');
        if (!this.commandsDir) throw new TypeError('No commands directory provided!');
        if (typeof this.commandsDir !== 'string') throw new TypeError('The commands Directory must be a string.');
        if (!this.eventsDir) throw new TypeError('No events directory provided!');
        if (typeof this.eventsDir !== 'string') throw new TypeError('The events Directory must be a string.');
        if (!this.client.commands || !this.client.commands instanceof Discord.Collection) this.client.commands = new Discord.Collection();
        if (!this.client.aliases || !this.client.aliases instanceof Discord.Collection) this.client.aliases = new Discord.Collection();
        if (!this.client.botAdmins || !Array.isArray(this.client.botAdmins)) this.client.botAdmins = [];
    }
    /**
     * Resolve a command from a string
     * @param {string} command - The command to resolve.
     * @return {object} command -The command resolved, if any.
     */
    resolveCommand(command) {
        var cmd;
        if (this.client.commands.has(command)) {
            cmd = this.client.commands.get(command);
        } else {
            cmd = this.client.aliases.get(command);
        }
        return cmd;
    }
    /**
     * This function splits spaces and creates an array of object defining both the type of group (based on quotes) and the value (text) of the group.
     * @param string The string to split.
     * @see parse
     */
    parseDetailed(string) {
        const groupsRegex = /[^\s"']+|(?:"|'){2,}|"(?!")([^"]*)"|'(?!')([^']*)'|"|'/g;

        const matches = [];

        let match;

        while ((match = groupsRegex.exec(string))) {
            if (match[2]) {
                // Single quoted group
                matches.push({
                    type: "single",
                    value: match[2]
                });
            } else if (match[1]) {
                // Double quoted group
                matches.push({
                    type: "double",
                    value: match[1]
                });
            } else {
                // No quote group present
                matches.push({
                    type: "plain",
                    value: match[0]
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
        return this.parseDetailed(string)
            .map((details) => details.value);
    }
    /**
     * Handles a command from a message event. (Does not support message edits)
     * @param {import('discord.js').Message} message
     * @return {object} - The command resolved, if any.
     */
    async handleCommand(message) {
        if (message && message.partial) message = await message.fetch()
            .catch(() => null);
        if (!message) return; // If we're given a partial deleted message, don't do anything with it! It's useless anyway!
        if (message.author.bot == true) return;
        if (message.type !== "DEFAULT") return; // Only regular user messages.
        if (message.guild && !message.channel.permissionsFor(message.guild.me)
            .serialize()
            .SEND_MESSAGES)
            return; // If the bot can't send messages to the channel, ignore.
        // If there is any custom guild prefixes, fetch from the database and redefine the botPrefix to their custom prefix for the server.
        const prefixRegex = new RegExp(
            `^(<@!?${this.client.user.id}>|${escapeRegex(this.botPrefix)})\\s*`
        );
        if (!prefixRegex.test(message.content)) return;
        const [, matchedPrefix] = message.content.match(prefixRegex);
        const {
            args,
            flags
        } = this.parseFlags(message.content.slice(matchedPrefix.length)
            .trim()
            .split(/ +/)); // The flags are parsed and also returns back the arguments without the flags in them!
        const command = args.shift()
            .toLowerCase(); // This shouldn't be changed... AT ALL. This is what triggered the command.
        args.executor = command;
        const parsedArgs = this.parse(args.join(" ")); // This allows arguments like 'ARGUMENT WITH SPACES' to be interpreted as one argument.
        try {
            var cmd = this.resolveCommand(command);
            if (!cmd) return;
            if (cmd.ownerOnly && !this.client.botAdmins.includes(message.author.id)) return; // Do not reply to commands such as eval...
            if (cmd.nsfwOnly) {
                const nsfwPrompt = new Discord.MessageEmbed()
                    .setColor("RED")
                    .setAuthor(
                        this.client.user.username + "'s Safety System",
                        message.author.avatarURL()
                    )
                    .setDescription(
                        `The command \`${cmd.name}\` can only be ran in NSFW channels.`
                    )
                    .setTimestamp();
                if (message.channel.nsfw == false)
                    return message.reply(
                            `${message.author.toString()}, oh no, this command is exclusive to NSFW channels. ${message.channel.permissionsFor(message.member).serialize(false).USE_EXTERNAL_EMOJIS
                     ? "<:sa_smirk:775582286556692491>"
                     : ";)"}`,
                            nsfwPrompt
                        )
                        .catch(() => null);
            }
            if (cmd.guildOnly) {
                const guildOnly = new Discord.MessageEmbed()
                    .setColor("RED")
                    .setDescription(
                        `The \`${cmd.name}\` command can only be ran in guilds.`
                    );
                if (!message.guild)
                    return message.reply(`${message.author.toString()},`, guildOnly)
                        .catch(
                            () => null
                        );
            }
            if (cmd.specialGuilds && !message.guild || cmd.specialGuilds && !cmd.specialGuilds.includes(message.guild.id))
                return;
            await cmd.execute(message, args, this.client, flags, parsedArgs)
                .catch(async e => {
                    if (cmd.finally) await cmd.finally(message, args, this.client, flags, parsedArgs)
                    throw e || new Error(`Unknown error`)
                })
                .then(async() => {
                    if (cmd.finally) await cmd.finally(message, args, this.client, flags, parsedArgs)
                });
        } catch (error) {
            console.error(`❌ | There was an error while running the command ${command} (${cmd.filepath || 'Unknown filepath'}).\nUser: ${message.author.tag} (${message.author.id})\nRan in ${message.guild || 'DMs'}\nArguments: ${args.join(", ")}\n${message.guild ? `(${message.guild.id})` : ''}`)
            console.error(error);
            return message.reply(
                    `there was an error trying to execute that command!\n${this.client.botAdmins.includes(message.author.id)
               ? `Please check the console for further details.`
               : `If this error persistents, contact the developers of this bot.`}`
                )
                .catch(() => null);
        }
    }
    /**
     * Handles a slash command from interactionCreate event.
     * @param {Discord.Interaction} interaction
     * @return {object} - The command resolved, if any.
     */
    async handleSlashCommand(interaction) {
        if (!interaction) return;
        if (interaction.user.bot) return;
        if (!interaction.isCommand()) return; // Only regular slash commands.
        // if (!interaction.channel.permissionsFor(interaction.guild.me)
        //     .serialize()
        //     .SEND_MESSAGES)
        //     return; // If the bot can't send messages to the channel, ignore.
        const command = interaction.commandName;
        const args = [];
        try {
            var cmd = this.resolveCommand(command);
            if (!cmd) return;
            if (cmd.ownerOnly && !this.client.botAdmins.includes(interaction.user.id)) return; // Do not reply to commands such as eval...
            if (cmd.nsfwOnly) {
                const nsfwPrompt = new Discord.MessageEmbed()
                    .setColor("RED")
                    .setAuthor(
                        this.client.user.username + "'s Safety System",
                        interaction.user.avatarURL()
                    )
                    .setDescription(
                        `The command \`${cmd.name}\` can only be ran in NSFW channels.`
                    )
                    .setTimestamp();
                if (interaction.channel.nsfw == false)
                    return interaction.reply(
                            `${interaction.user.toString()}, oh no, this command is exclusive to NSFW channels. :smirk:`, {
                                embeds: [nsfwPrompt]
                            })
                        .catch(() => null);
            }
            if (cmd.specialGuilds && !interaction.guild || cmd.specialGuilds && !cmd.specialGuilds.includes(interaction.guild.id))
                return;
            interaction.author = interaction.user;
            interaction.delete = interaction.deleteReply;
            interaction.edit = interaction.editReply;
            interaction.options.data.map((x) => {
                args.push(x.value);
            })
            await cmd.execute(interaction, args, this.client, [], args)
                .catch(async e => {
                    if (cmd.finally) await cmd.finally(message, args, this.client, flags, parsedArgs)
                    throw e || new Error(`Unknown error`)
                })
                .then(async() => {
                    if (cmd.finally) await cmd.finally(message, args, this.client, flags, parsedArgs)
                });
        } catch (error) {
            console.error(`❌ | There was an error while running the slash command ${command} (${cmd.filepath || 'Unknown filepath'}).\nUser: ${interaction.user.tag} (${interaction.user.id})\nRan in ${interaction.guild || 'DMs'}\nArguments: ${args}\n${interaction.guild ? `(${interaction.guild.id})` : ''}`)
            console.error(error);
            return interaction.editReply(
                    `There was an error trying to execute that slash command!\n${this.client.botAdmins.includes(interaction.user.id)
               ? `Please check the console for further details.`
               : `If this error persistents, contact the developers of this bot.`}`
                )
                .catch(() => null);
        }
    }
    /**
     * Handles autocompletion from interactionCreate event.
     * @param {Discord.Interaction} interaction
     * @return {object} - The command resolved, if any.
     */
    async handleAutocomplete(interaction) {}
    /**
     * Register commands from a folder
     * @param {string} dir - The directory to register commands from.
     */
    async registerCommands(dir = this.commandsDir) {
        const commandFiles = await fs.readdir(path.join(__dirname, dir));
        for (const file of commandFiles) {
            let stat = await fs.lstat(path.join(__dirname, dir, file));
            if (stat.isDirectory())
                // If file is a directory, recursive call recurDir
                this.registerCommands(path.join(dir, file));
            else {
                if (file.endsWith(".js")) {
                    try {
                        const command = require(path.join(__dirname, dir, file));
                        if (!command) {
                            console.error(
                                `${file} does not seem to export anything. Ignoring the command.`
                            );
                            continue;
                        }
                        if (!command.name) {
                            console.error(
                                `${file} does not export a name. Ignoring the command.`);
                            continue;
                        }
                        if (command.category)
                            command.category = command.category.toLowerCase();
                        if (!command.category && path.basename(dir)
                            .toLowerCase() !== "commands")
                            command.category = path.basename(dir)
                            .toLowerCase();
                        if (command.category == "owner")
                            command.ownerOnly = true;
                        command.filepath = path.join(__dirname, dir, file);
                        if (command.arguments) {
                            const slashy = new SlashCommandBuilder()
                                .setName(command.name)
                                .setDescription(command.description || 'No description')
                            for (let i = 0; i < command.arguments.length; i++) {
                                const argument = command.arguments[i];
                                if (command.arguments[i]?.type == 'string') {
                                    const testingSlashy = slashy.addStringOption(
                                        option => option.setName(argument.name)
                                        .setDescription(argument.description)
                                        .setRequired(argument.required === undefined ? true : argument.required)
                                        )
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

                    } catch (e) {
                        console.error(`❌ | There was an error loading command ${file}:\n`, e);
                    }
                }
            }
        }
    }
    /**
     * Register events from a folder.
     * @param {string} dir - The directory to register events from.
     */
    async registerEvents(dir = this.eventsDir) {
        let files = await fs.readdir(path.join(__dirname, dir));
        // Loop through each file.
        for (let file of files) {
            let stat = await fs.lstat(path.join(__dirname, dir, file));
            if (stat.isDirectory())
                // If file is a directory, recursive call recurDir
                this.registerEvents(path.join(dir, file));
            else {
                // Check if file is a .js file.
                if (file.endsWith(".js")) {
                    let eventName = file.substring(0, file.indexOf(".js"));
                    try {
                        let eventModule = require(path.join(__dirname, dir, file));
                        if (!eventModule) {
                            console.error(
                                `${file} does not seem to export anything. Ignoring the event.`
                            );
                            continue;
                        }
                        if (typeof eventModule !== "function") {
                            console.error(
                                `Expected a function for the event handler... Got ${typeof eventModule}.`
                            );
                            continue;
                        }
                        console.log(`📂 ${dir} | ${eventName} event loaded!`);
                        this.client.on(eventName, eventModule.bind(null, this.client));
                    } catch (err) {
                        console.log(`❌ | There was an error loading event ${file}!`);
                        console.error(err);
                    }
                }
            }
        }
    }
    /**
     * Parse flags from  a array.
     * @param {Array} args - The arguments to parse from.
     * @returns {object} - The parsed flags & the new arguments.
     */
    parseFlags(args) {
        const flags = {};
        for (var arg of args) {
            if (arg.startsWith("--")) {
                let flag = arg
                    .substr(2);
                let eq = flag.indexOf("=");
                if (eq != -1) {
                    flags[flag.substr(0, eq).toLowerCase()] = flag.substr(eq + 1);
                    delete args[args.indexOf(arg)];
                } else {
                    flags[flag.toLowerCase()] = true;
                    delete args[args.indexOf(arg)];
                }
            } else if (arg.startsWith("-") && arg.length > 2) {
                let flag = arg
                    .substr(1);
                let eq = flag.indexOf("=");
                if (eq != -1) {
                    flags[flag.substr(0, eq).toLowerCase()] = flag.substr(eq + 1);
                    delete args[args.indexOf(arg)];
                } else {
                    flags[flag.toLowerCase()] = true;
                    delete args[args.indexOf(arg)];
                }
            }
        }
        args = args.filter(function(el) {
            return el != null;
        });
        return {
            args: args,
            flags: flags
        };
    }
};

module.exports = CommandHandler;