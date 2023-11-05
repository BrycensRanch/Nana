const Discord = require('discord.js');
const axios = require('axios').default;
const Client = require('ssh2-sftp-client');
var properties = require("minecraft-server-properties");
const yaml = require('js-yaml');

const sftp = new Client();
const fs = require("fs");
const path = require("path")
const moment = require("moment");
const {relativeTime} = require('human-date')
const prettyPrint = (date) =>  date.toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"})
const removeFormatting = (s) => s.replace(/\W/g, '')
const qs = require('qs');

function durationAsString(ms, maxPrecission = 3) {
    const duration = moment.duration(ms)

    const items = []
    items.push({ timeUnit: 'd', value: Math.floor(duration.asDays()) })
    items.push({ timeUnit: 'h', value: duration.hours() })
    items.push({ timeUnit: 'm', value: duration.minutes() })
    items.push({ timeUnit: 's', value: duration.seconds() })

    const formattedItems = items.reduce((accumulator, { value, timeUnit }) => {
        if (accumulator.length >= maxPrecission || (accumulator.length === 0 && value === 0)) {
            return accumulator
        }

        accumulator.push(`${value}${timeUnit}`)
        return accumulator
    }, [])

    return formattedItems.length !== 0 ? formattedItems.join(' ') : '-'
}
const capitalize = (text, username = false) => {
    if (!username) text = text?.toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ');
    const arr = text?.split(' ');
    for (let i = 0; i < arr?.length; i++) {
        arr[i] = arr[i][0]?.toUpperCase() + arr[i]?.substr(1);
    }
    return arr?.join(" ");
};
const minecraftToDiscord = (str) => {
    return str.replace(/§.{1}/g, '').replace(/&.{1}/g, '').replace(/(?:#)[0-9a-f]{8}|(?:#)[0-9a-f]{6}|(?:#)[0-9a-f]{4}|(?:#)[0-9a-f]{3}/ig, '')
}
const util = require('util');

// Convert fs.readFile into Promise version of same    
const readFile = util.promisify(fs.readFile);
const {
    success: sass
} = require('../sass.json');
const {
    Punishment
} = require('../model/Punishment');
const {
    LinkedAccount
} = require('../model/LinkedAccount');

function debugLine(message) {
    let e = new Error();
    let frame = e.stack.split("\n")[2]; // change to 3 for grandparent func
    let lineNumber = frame.split(":").reverse()[1];
    let functionName = frame.split(" ")[5];
    return functionName + ":" + lineNumber + " " + message;
}
const PasteGG = require("paste.gg");
const UserNotFoundError = new Error("User not found");
UserNotFoundError.name = "UserNotFoundError"
// For any interested contributors or maybe new code owners - Don't be afraid to visit https://tydiumcraft.net/api , it has useful APIs for bedrock
module.exports = {
    name: "history",
    description: "Review a player's history..",
    aliases: ["search", "lookup"],
    ownerOnly: false,
    nsfwOnly: false,
    guildOnly: false,
    arguments: [
        {
            name: "platform",
            type: "string",
            description: "Platform to search on",
            choices: [
                {
                    "name": "Java",
                    "value": "Java"
                },
                {
                    "name": "Bedrock",
                    "value": "Bedrock"
                }
            ],
            required: true
      },
        {
            name: "username",
            type: "string",
            description: "Enter Player's username to search",
            required: true
      }
    ],
    specialGuilds: null, // Array of guild IDs that this command can be ran in.
    examples: [],
    /**
     * @param {Discord.Message} message Message class
     * @param {Array<String>} args User provided arguments.
     * @param {Discord.Client} client Discord.js client
     * @param {Object} flags User provided flags
     * @param {Array<String>} parsedArgs Parsed arguments like "discord epic" are seen as one argument.
     */
    execute: async function (message, args, client, flags, parsedArgs) {
        const pasteGG = new PasteGG(client.config.pasteGGKey);
        const options = {
            validateStatus: (status) => true,
            headers: {
                "Token": client.config.restAPIKey
            },
            'content-type': 'application/x-www-form-urlencoded',
        }
        const placeholderEndpoint = client.config.restAPIURL + `/v1/placeholders/replace`

        async function getPlaceholder(placeholder, uuid) {
            const {data, statusText, request} = await axios(placeholderEndpoint,
                {
                    method: "POST",
                    data: qs.stringify({
                        uuid,
                        message: placeholder
                    }),
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                    },
                    validateStatus: (status) => true,
                })
            if (statusText !== "OK") return data;
            if (typeof data !== "string") return data;
            return data;
        }

        async function getPlaceholders(placeholders, uuid) {
            const {data, statusText, request} = await axios(placeholderEndpoint,
                {
                    method: "POST",
                    validateStatus: (status) => true,
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                    },
                    data: qs.stringify({
                        uuid,
                        message: placeholders.join("|")
                    })
                })

            if (statusText !== "OK") return data;
            if (typeof data !== "string") return data;
            return data.split('|');
        }

        var shouldContinueRunning = true
        const runningAsInteraction = message instanceof Discord.BaseInteraction;
        const debugMessages = [];
        var lastMessage;
        /**
         * @param {any} whatever Message class
         */
        var send = (whatever) => {
            if (typeof whatever === "string" && whatever.includes('never played')) sftp.end().catch(() => null)
            if (runningAsInteraction) {
                message.reply(whatever).then((m) => {
                    lastMessage = m
                })
                    .catch(console.error)

            } else {
                message.channel.send(whatever).then((m) => {
                    lastMessage = m
                })
                    .catch(console.error)
            }
        }

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

        var apiResponse;

        async function getUserData(platform = "Java", id) {
            if (runningAsInteraction) {
                message.deferReply();
                send = (whatever) => {
                    if (runningAsInteraction) {
                        message.editReply(whatever).then((m) => {
                            lastMessage = m
                        })
                            .catch(console.error)

                    } else {
                        message.channel.send(whatever).then((m) => {
                            lastMessage = m
                        })
                            .catch(console.error)
                    }
                }
            } else {
                message.channel.sendTyping();
            }
            if (!id) throw new TypeError("Id parameter is REQUIRED.")
            if (platform == 'Java') {
                var request = await axios.get(`https://playerdb.co/api/player/minecraft/${id}`, {
                    validateStatus: (status) => status === 200 || 404
                })
                debugMessages.push(request.data, id)
                if (!request || !request?.data || !request?.data?.data?.player?.username) return send("The specified user could not found or there was an error.")

                apiResponse = request.data.data.player;
                apiResponse.name = apiResponse.username;
                player.platform = capitalize(parsedArgs[0]);
                parsedArgs[1] = apiResponse.username;
            } else if (platform == 'Bedrock') {
                debugMessages.push('ID before modification, probably', id)
                id = id.replace(/./, '').replace(/_/, " ").trim(); // safety
                if (id.startsWith("00000000-0000-0000-000")) {
                    id = parseInt(id.replace(/00000000-0000-0000-000/, '').replace(/-/, ''), 16).toString();
                }
                if (id.startsWith("000000-0000-0000-000")) {
                    id = parseInt(id.replace(/000000-0000-0000-000/, '').replace(/-/, ''), 16).toString()
                }
                debugMessages.push("id after modification:", id)
                var request = await axios.get(`https://playerdb.co/api/player/xbox/${id}`, {
                    validateStatus: (status) => status === 200 || 404
                })
                debugMessages.push(request.config.url, request.data)
                if (!request || !request?.data || !request?.data?.data?.player?.username) return send("The specified user could not found on Xbox or there was an error.")
                apiResponse = request.data.data.player;
                apiResponse.name = "." + apiResponse.username.replace(/ /, "_");
                player.platform = capitalize(parsedArgs[0]);
                parsedArgs[1] = "." + apiResponse.username.replace(/ /, "_");
            } else {
                throw new TypeError("Not a proper platform given: " + platform)
            }
            return apiResponse;
        }

        const punishmentRepo = client.db.getRepository(Punishment)
        const currentPunishedRepo = client.db.getRepository('Punishments')
        const UserSettings = client.db2.getRepository("UserSettings");

        var player = {};
        player.platform = capitalize(parsedArgs[0]);
        if (!parsedArgs[0]) {
            const linkedAccount = await client.DatabaseManager.getLinkedAccount(message.author.id)
            if (!linkedAccount) {
                return send("There's no linked account related to this user, perhaps they have yet to run `/discord link` in-game?")
            } else {
                parsedArgs[0] = linkedAccount.uuid.startsWith("00000000-0000-0000-000") ? 'Bedrock' : 'Java'
                player.platform = parsedArgs[0]
                parsedArgs[1] = linkedAccount.uuid
                player.discord = linkedAccount;
            }
        }
        if (!this.arguments[0]?.choices.map(x => x.name).includes(player.platform) && !apiResponse) {
            switch (true) {
                case /\d{17,23}/.test(parsedArgs[0]):
                case /<@!*&*[0-9]+>/.test(parsedArgs[0]):
                    debugMessages.push("MENTION/ID DETECTED")
                    const id = parsedArgs[0].replace(/^<@([^>]+)>$/gim, '$1').replace(/!/, '').trim();
                    debugMessages.push("ID GIVEN: ", id)
                    const user = await client.users.fetch(id).catch(() => null);
                    if (user) {
                        const linkedAccount = await client.DatabaseManager.getLinkedAccount(id);
                        if (linkedAccount?.discord) {
                            player.platform = linkedAccount.uuid.startsWith("00000000-0000-0000-000") ? 'Bedrock' : 'Java'
                            parsedArgs[0] = player.platform
                            parsedArgs[1] = linkedAccount.uuid
                            player.discord = linkedAccount;
                        } else return send("There's no linked account related to this user, perhaps they have yet to run `/discord link` in-game?")
                    } else if (!apiResponse) return send("I understood you wanted to search the history of a player, but they don't seem to exist on Discord!")
                    break;
                case parsedArgs[0]?.startsWith("."):
                    debugMessages.push("BEDROCK USER SEARCH DETECTED")
                    debugMessages.push("USERNAME GIVEN: ", parsedArgs[0])
                    parsedArgs[1] = parsedArgs[0]
                    player.platform = 'Bedrock';
                    parsedArgs[0] = player.platform;
                    break;
                case /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsedArgs[0]):
                case parsedArgs[0]?.startsWith("00000000-0000-0000"):

                    debugMessages.push("UUID USER SEARCH DETECTED")
                    debugMessages.push("UUID GIVEN: ", parsedArgs[0])
                    parsedArgs[1] = parsedArgs[0]
                    player.platform = parsedArgs[1].startsWith("00000000-0000-0000") ? 'Bedrock' : 'Java'
                    parsedArgs[0] = player.platform
                    break;
                case /^.{3,32}#[0-9]{4}$/.test(parsedArgs[0]):
                    debugMessages.push("USER TAG SEARCH DETECTED");
                    debugMessages.push("USER TAG GIVEN: ", parsedArgs[0])
                    const members = await message.guild.members.fetch({
                        cache: true
                    })
                    var member = members.find(m => m.user.tag == parsedArgs[0])
                    if (!member) member = members.find(m => m.user.tag.toLowerCase().trim() == parsedArgs[0].toLowerCase().trim())
                    if (!member) return send("No Discord member could be found with that Discord tag in this guild!")
                    const linkedAccount = await client.DatabaseManager.getLinkedAccount(member.id);
                    if (!linkedAccount?.discord) return send("There's no linked account related to this user, perhaps they have yet to run `/discord link` in-game?")
                    player.discord = linkedAccount;
                    player.platform = linkedAccount.uuid.startsWith("00000000-0000-0000-000") ? 'Bedrock' : 'Java'
                    parsedArgs[0] = player.platform
                    parsedArgs[1] = linkedAccount.uuid
                case /^[a-zA-Z0-9_]{2,16}$/mg.test(parsedArgs[0]):
                    debugMessages.push("Java User SEARCH DETECTED");
                    debugMessages.push("Java User Given: ", parsedArgs[0])
                    parsedArgs[1] = parsedArgs[0]
                    player.platform = 'Java';
                    parsedArgs[0] = player.platform;

                default:
                    if (!this.arguments[0]?.choices.map(x => x.name).includes(player.platform)) {
                        debugMessages.push(player.platform, this.arguments[0]?.choices.map(x => x.name).includes(player.platform))
                        return send({
                            embeds: [new Discord.MessageEmbed()
                                .setTitle(":x: | Incorrect Command Usage")
                                .setDescription(`You need to specify whether or not you want to search on \`Java\` or \`Bedrock\`\n**Example**: ${runningAsInteraction ? '/' : client.config.prefix}history Java Romvnly`)]
                        })
                    }
                    break;
            }

        }
        if (!apiResponse && parsedArgs[1]?.match(/<@!*&*[0-9]+>/)) {
            debugMessages.push("MENTION DETECTED")
            const id = parsedArgs[0]?.replace(/^<@([^>]+)>$/gim, '$1').replace(/!/, '').trim();
            debugMessages.push("ID GIVEN: ", id)
            const user = await client.users.fetch(id).catch(() => null);
            if (user) {
                const linkedAccount = await client.DatabaseManager.getLinkedAccount(id);
                if (linkedAccount?.discord) {
                    parsedArgs[0] = linkedAccount.uuid.startsWith("00000000-0000-0000-000") ? 'Bedrock' : 'Java'
                    parsedArgs[1] = linkedAccount.uuid
                    player.discord = linkedAccount;
                    await getUserData(linkedAccount.uuid.startsWith("00000000-0000-0000-000") ? 'Bedrock' : 'Java', linkedAccount.uuid)
                }
            } else if (!apiResponse && !user) return send("There's no linked account related to this user, perhaps they have yet to run `/discord link` in-game?")
        }
        const tomorrow = client.utils.whatIsTomorrow();

        if (!parsedArgs[1]) {
            return send({
                embeds: [new Discord.MessageEmbed()
                    .setTitle(":x: | Incorrect Command Usage")
                    .setDescription(`You need to specify a username\n**Example**: ${runningAsInteraction ? '/' : client.config.prefix}history Java Romvnly`)]
            })
        }
        if (!parsedArgs[1]?.startsWith('.') && player.platform == 'Bedrock') parsedArgs[1] = "." + parsedArgs[1]?.replace(/ /, "_");

        var isUUID = apiResponse ? true : parsedArgs[1]?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
        let usernameFormat;
        if (player.platform == 'Java') usernameFormat = /^[0-9A-Za-z_]{1,16}$/i;
        if (player.platform == 'Bedrock') {
            if (parsedArgs[1].includes("#")) {
                usernameFormat = /^.{3,23}#[0-9]{4}$/;
            } else {
                usernameFormat = /^.{3,23}[a-zA-Z0-9]+([_ -]?[a-zA-Z0-9])*$/;
            }
        }
        if (!parsedArgs[1]?.match(usernameFormat) && !isUUID) return send("That's not a valid username!~!!!! SOTP!")
        if (parsedArgs[1]?.split(".").length > 2) return send("That's not a valid username!~!!!! ARE U TRYING TO DO A EXPLOIT???")
        if (!apiResponse) await getUserData(player.platform, parsedArgs[1]);

        try {
            const otherOptions = {
                agent: process.env.SSH_AUTH_SOCK,
                debug: (e) => debugMessages.push(e)
            }
            const optionsWithExtra = {
                ...client.config.sshLogin,
                ...otherOptions
            }
            await sftp.connect(optionsWithExtra)
        } catch (e) {
            console.error(e);
            if (e.message.includes("already defined")) {
                await sftp.end()
                return send("The previous command I handled didn't exit properly. Please run this command again, it will work. I PROMISE")
            } else if (!e instanceof TypeError) return send("Oh dang it! I ran into a stupid error. Perhaps The Whole Easy SMP Network is down?");
        }
        try {
            if (!apiResponse) return;
            const bedrockGamertag = apiResponse.username;
            debugMessages.push(apiResponse)
            player.name = apiResponse.name;
            if (player.platform == 'Java') player.uuid = apiResponse.id
            if (player.platform == 'Bedrock') player.xbox = apiResponse.meta;
            // TownyAdvanced data logic (FLAT DATA ONLY)
            const playerPath = path.join(client.config.sshLogin.minecraftServerPath, "plugins/Towny/data/residents/", player.name + '.txt');
            const localPlayerPath = path.join(client.tempDir, 'commands', player.name + '.txt');
            const townyFileExists = await sftp.exists(playerPath)
            if (!townyFileExists) return send("There was no towny playerdata found for this player, perhaps they've never played on Easy SMP?")
            await sftp.fastGet(playerPath, localPlayerPath)
            const playerFile = await readFile(localPlayerPath, 'utf-8');
            fs.unlinkSync(localPlayerPath)
            const playerProperties = properties.parse(playerFile);
            if (!playerProperties) return send("Failed to parse player data!!! WEEWOWOOOo");
            if (player.platform == 'Bedrock' && !player.uuid) {
                player.uuid = playerProperties.uuid;
            }
            player.isNPC = playerProperties.isNPC;
            if (player.isNPC) return send("This player is a RESERVED NPC!")
            player.punishmentHistory = await punishmentRepo.find({
                name: player.name
            })
            var pasteLink;
            if (player.punishmentHistory?.length) {
                pasteLink = await pasteGG.post({
                    description: `Easy SMP » Punishment History for ${player.name}`, // Optional
                    expires: tomorrow, // Optional (must be a UTC ISO 8601 string)
                    files: [{
                        name: "history.txt", // Optional
                        content: {
                            format: "text",
                            value: player.punishmentHistory.map(x => `${capitalize(x.punishmentType)} for ${x.reason ? minecraftToDiscord(x.reason) : 'N/A'} [DURATION: ${x?.end?.length && x?.end !== '-1' ? durationAsString(x?.end - x?.start) : 'PERM'}, STAFF: ${x.operator == 'CONSOLE' ? 'PAMA' : x.operator}, ID: ${x.id}]`).join("\n")
                        }
                    }]
                })
                if (pasteLink.status !== "success") console.error(`Failed to upload paste.gg link for ${player.name} (${player.platform})`, player)
            }
            if (!player?.discord) player.discord = await client.DatabaseManager.getLinkedAccount(player.uuid);
            debugMessages.push(player.discord)

            if (player.discord?.discord) player.discord.user = await client.users.fetch(player.discord?.discord).catch(() => null);
            // Essentials data logic
            const remoteEssentialsPath = path.join(client.config.sshLogin.minecraftServerPath, "plugins/Essentials/userdata/", player.uuid + '.yml')
            const essentialsFileExists = await sftp.exists(remoteEssentialsPath)
            if (!essentialsFileExists) return send("There was no Essentials data found for this player, perhaps they've never played on Easy SMP?")
            const localEssentialsPath = path.join(client.tempDir, 'commands', player.name + '.yml')
            await sftp.fastGet(remoteEssentialsPath, localEssentialsPath)
            const essentialsFile = await readFile(localEssentialsPath);
            fs.unlinkSync(localEssentialsPath)
            const essentialsData = yaml.load(essentialsFile)
            player.lastOnline = playerProperties.lastOnline ? moment(playerProperties.lastOnline).fromNow() : null;
            player.creation = playerProperties.registered ? moment(playerProperties.registered).fromNow() : null;
            player.friends = playerProperties?.friends?.split(',') || [];
            player.town = {
                name: removeFormatting(playerProperties.town),
                id: removeFormatting(playerProperties.town),
                exists: !!playerProperties.town,
                ranks: playerProperties['town-ranks'],
                joinedAt: playerProperties.joinedTownAt ? moment(playerProperties.joinedTownAt).fromNow() : null
            }
            if (player.town.exists) {
                // TownyAdvanced data logic (FLAT DATA ONLY)
                const townPath = path.join(client.config.sshLogin.minecraftServerPath, "plugins/Towny/data/towns/", player.town.name + '.txt');
                const localTownPath = path.join(client.tempDir, 'commands', player.name + '-' + player.town.name + '.txt');
                const townyFileExists = await sftp.exists(townPath)
                if (!townPath) return send("There was no towny data found for this town... Catastrophic failure")
                await sftp.fastGet(townPath, localTownPath)
                const townFile = await readFile(localTownPath, 'utf-8');
                fs.unlinkSync(localTownPath)
                const townProperties = properties.parse(townFile);
                if (!townProperties) return send("Failed to parse town data!!! WEEWOWOOOo");
                // I feel like this is a bit cursed.
                player.town = {
                    ...player.town,
                    ...townProperties
                }
            }
            const [town, ranks, namePrefix, online] = await getPlaceholders(['%townyadvanced_town%', '%townyadvanced_town_ranks%', '%townyadvanced_towny_name_prefix%', '%player_online%'], player.uuid).catch((e) => {
                if (e.message.includes('ECONNREFUSED') || e.message.includes('TIME')) return send(":bangbang: | I **failed** to establish a connection to the Minecraft server's REST API. Please try again later.")
                shouldContinueRunning = false
            })
            if (town) player.town.name = minecraftToDiscord(town);
            if (ranks) player.town.ranks = minecraftToDiscord(ranks);
            player.towny = {
                title: playerProperties.title,
                surname: playerProperties.surname
            }
            if (namePrefix) player.towny.prefix = minecraftToDiscord(namePrefix);
            if (player.town.ranks && !Array.isArray(player.town.ranks)) {
                player.town.ranks = [player.town.ranks]
            }
            player.balance = essentialsData.money;
            let isVanished = false;
            if (player.online) isVanished = (await getPlaceholder('%vanish_vanished%', player.uuid)) !== "true";
            player.online = online === "yes" && !isVanished;
            if (player.online) {
                const [advancementProgress, advancementsToBeCompleted] = await getPlaceholders(['%Advancements_completedAmount%', '%Advancements_remainingAmount%'], player.uuid)
                player.advancements = {
                    progress: advancementProgress,
                    toBeCompleted: advancementsToBeCompleted,
                    percentage: advancementProgress / advancementsToBeCompleted * 100 + '%'
                }
            }
            player.metadata = {
                afk: !essentialsData.afk ? false : essentialsData.afk,
                godmode: essentialsData.godmode === undefined ? false : essentialsData.godmode,
                jailed: essentialsData.jailed === undefined ? false : essentialsData.jailed,
                acceptingPay: essentialsData['accepting-pay'] === undefined ? true : essentialsData['accepting-pay'],
                onlineFor: player.online ? durationAsString(new Date().getTime() - essentialsData.timestamps.login) : null
            }
            if (!player.metadata.afk) {
                player.metadata.afk = (await getPlaceholder('%plan_player_is_afk%', player.uuid)) === "yes"
            }
            // https://help.minecraft.net/hc/en-us/articles/8969841895693
            // This feature will NEVER work like it used to 2 years ago. Thanks, Mojang! ❤️
            // https://cdn.arstechnica.net/wp-content/uploads/2012/06/torvaldsnvidia-640x424.jpg
            const nameHistory = player.platform == 'Java' ? apiResponse.meta.name_history : [{
                name: 'Java only feature!'
            }];
            player.nameHistory = nameHistory?.map(x => `${x.name}${x.changedToAt ? ' (' + moment(x.changedToAt).fromNow() + ')' : ''}`) || []
            const userSetting = await UserSettings.findOneBy({
                uuid: player.uuid
            })
            player.ranks = (await getPlaceholder('%luckperms_groups%', player.uuid) || "").split(', ').filter(function (e) {
                return e
            })
            if (!player.ranks.length) player.ranks = null;
            player.description = userSetting?.description || 'The Edge Lord';
            try {
                const remoteBannedPlayersPath = path.join(client.config.sshLogin.minecraftServerPath, "banned-players.json")
                const localBannedPlayers = path.join(client.tempDir, 'commands', 'banned-players.json')
                await sftp.fastGet(remoteBannedPlayersPath, localBannedPlayers)
                const bannedPlayers = JSON.parse(await readFile(localBannedPlayers, 'utf-8'))
                player.banned = bannedPlayers.find(x => x.uuid == player.uuid);
                fs.unlinkSync(localBannedPlayers);
            } catch (e) {
                console.error(e)
                send(":warning: | Something went wrong with getting the user's banned state")
            }
            if (!player.banned) {
                const currentlyPunished = await currentPunishedRepo.findOneBy({
                    uuid: player.uuid.replace(/-/g, "")
                })
                if (currentlyPunished) {
                    player.banned = {
                        uuid: player.uuid,
                        name: player.name,
                        created: Number(currentlyPunished.start),
                        source: currentlyPunished.operator,
                        expires: currentlyPunished.end > 1 ? Number(currentlyPunished.end) : undefined,
                        reason: currentlyPunished.reason,
                        punishmentType: currentlyPunished.punishmentType
                    }
                }
            }
            // const NBTPath = path.join("/home/mcuser/minecraft/world/playerdata", player.uuid + '.dat')
            // const localNBTPath = path.join(client.tempDir, 'commands', player.uuid + '.dat');
            // await sftp.fastGet(NBTPath, localNBTPath)
            // const NBTFile = await readFile(localNBTPath);
            // var NBTProperties;
            // nbt.read(NBTFile, function (error, nbt) {
            //     if (error) throw error;
            //     NBTProperties = JSON.parse(JSON.stringify(nbt))
            //      // player.creation = NBTProperties.bukkit.firstPlayed? moment(NBTProperties.bukkit.firstPlayed.substring(0, NBTProperties.bukkit.firstPlayed.length - 1)).fromNow() : null
            // })
            // fs.unlinkSync(localNBTPath)
        } catch (e) {
            sftp.end().then(() => null).catch(() => null)
            console.error(e);
            if (!e instanceof TypeError) return send("Oh dang it! I ran into a stupid error. Perhaps The Whole Easy SMP Network is down?");
            else if (!shouldContinueRunning) return send("There is a error in our code! Contact the bot devs!")
            else return;
        }
        sftp.end().then(() => null).catch(() => null)
        const filter = i => i.user.id === message.author.id;
        const collector = message.channel.createMessageComponentCollector({filter, time: 300000});
        const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('stalkeranalytics')
                    .setLabel('Stalker Analytics')
                    .setStyle('PRIMARY'),
                new Discord.MessageButton()
                    .setCustomId('vote')
                    .setLabel('Voting Info')
                    .setStyle('SUCCESS'),
            );
        // Jobs Placeholders don't work for players that aren't online
        if (player.online) row.addComponents(new Discord.MessageButton()
            .setCustomId('jobs')
            .setLabel('Job Info')
            .setStyle('DANGER'))
        /**
         * @param {Discord.ButtonInteraction} i
         */
        collector.on('collect', async i => {
            if (i.customId === 'bedrock') {
                // change values
                await handleEmbed();
            }
            if (i.customId === 'java') {
                // change values
                await handleEmbed();
            }
            if (i.customId === 'stalkeranalytics') {
                // change values 
                await sendStalkerAnalytics(i);
            }
            if (i.customId === 'vote') {
                // change values
                await sendVotingInfo(i);
            }
            if (i.customId === 'jobs') {
                // change values
                await sendJobsInfo(i);
            }
        });
        if (player && player?.name && shouldContinueRunning) await handleEmbed()

        /**
         * @param {Discord.ButtonInteraction} i
         */
        async function sendStalkerAnalytics(i) {
            const [averagePingThisMonth, sessionCount, timeActive, timeAFK, timeTotal, activityIndex, activityGroup, playerKillCount, mobKillCount, deaths, kdr] = await getPlaceholders([
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
            ], player.uuid)
            player.plan = {}
            if (sessionCount) player.plan.sessionCount = Number(sessionCount);
            else {
                logError(sessionCount);
                return send(":warning: | Failed to retrieve sessionCount from our Rest API.")
            }
            row.components[0].setDisabled(true) //disables but_1
            i.update({components: [row]});
            i.channel.send({
                embeds: [
                    new Discord.MessageEmbed()
                        .setTitle("Player Analytics")
                        .setAuthor(message.author.tag)
                        .setDescription(`
                        Average Ping: ${averagePingThisMonth}
                        Session Count: ${player.plan.sessionCount}
                        Total Playtime: ${durationAsString(timeTotal)}
                        Time Active: ${durationAsString(timeActive)}
                        Time AFK: ${durationAsString(timeAFK)}
                        Activity Index: ${Number(activityIndex | 0).toFixed(2)} (${activityGroup})
                        
                        Player Kill Count: ${playerKillCount}
                        Mob Kill Count: ${mobKillCount}
                        Deaths: ${deaths}
                        KDR: ${Number(kdr).toFixed(2)}`)
                        .setColor("GREEN")
                        .setImage("https://camo.githubusercontent.com/e8537205e9ea89bd8c1d012035a9427e997c6a8f5ab105f5eac54f8aca5424bf/68747470733a2f2f7075752e73682f41585367372f356632663738633036632e6a7067")
                ]
            })
        }

        async function sendVotingInfo(i) {
            row.components[1].setDisabled(true) //disables but_1
            i.update({components: [row]});
            const [canVote, votePoints, totalVotes, totalVotesThisMonth, voteLeaderboardPosition, dailyVotingStreak, weeklyVotingStreak, monthlyVotingStreak] = await getPlaceholders([
                '%VotingPlugin_CanVote%',
                '%VotingPlugin_Points%',
                '%VotingPlugin_Total_AllTime%',
                '%VotingPlugin_Total_Monthly%',
                '%VotingPlugin_top_month_position%',
                '%VotingPlugin_DailyVoteStreak%',
                '%VotingPlugin_WeeklyVoteStreak%',
                '%VotingPlugin_MonthVoteStreak%'
            ], player.uuid)

            function stringToBoolean(string) {
                switch (string.toLowerCase().trim()) {
                    case "true":
                    case "yes":
                    case "1":
                        return true;

                    case "false":
                    case "no":
                    case "0":
                    case null:
                        return false;

                    default:
                        return Boolean(string);
                }
            }

            i.channel.send({
                embeds: [
                    new Discord.MessageEmbed()
                        .setTitle("Voting Stats")
                        .setAuthor(message.author.tag)
                        .setColor('RANDOM')
                        .setImage('https://i.imgur.com/V92BaS2.png')
                        .setDescription(`
                    Voted: ${stringToBoolean(canVote) ? 'No' : 'Yes'}
                    Vote Points: ${votePoints}
                    Lifetime Votes: ${totalVotes}
                    Votes this month: ${totalVotesThisMonth}

                    Leaderboard Position: ${voteLeaderboardPosition || 'N/A'}

                    Voting Streak (Daily): ${dailyVotingStreak}
                    Voting Streak (Weekly): ${weeklyVotingStreak}
                    Voting Streak (Monthly): ${monthlyVotingStreak}
                    `)
                ]
            })

        }

        async function sendJobsInfo(i) {
            row.components[2].setDisabled(true) //disables but_1
            i.update({components: [row]});
            const [jobCount, maxJobs, jobPoints, lifetimeJobPoints, jobs] = await getPlaceholders([
                '%jobsr_user_joinedjobcount%',
                '%jobsr_maxjobs%',
                '%jobsr_user_points%',
                '%jobsr_user_total_points%',
                '%jobsr_user_jobs%'
            ], player.uuid)
            const getJobLevel = async (job) => await getPlaceholder(`%jobsr_user_jlevel_${job}%`, player.uuid)
            const properJobs = jobs.split(/[ ,]+/).map((x) => minecraftToDiscord(x));
            const jobLevelsAndNames = await Promise.all(
                properJobs.map(async x => `${x} [Level: ${await getJobLevel(x.toLowerCase())}]`)
            );
            console.log(await getJobLevel('builder'), properJobs, jobLevelsAndNames)
            i.channel.send({
                embeds: [
                    new Discord.MessageEmbed()
                        .setTitle("Steve Jobs")
                        .setColor('DARK_RED')
                        .setImage('https://camo.githubusercontent.com/a5cba6dca85527f5852304bf436dc4d531d53fcd006d0eadb26733c4c7716431/68747470733a2f2f7777772e737069676f746d632e6f72672f646174612f7265736f757263655f69636f6e732f342f343231362e6a70673f31343234343633373639')
                        .setAuthor(message.author.tag)
                        .setDescription(`
                    Jobs: ${jobCount} / ${maxJobs}
                    Job Points: ${jobPoints}
                    Lifetime Job Points: ${lifetimeJobPoints}
                    Job Info:
                    - ${(jobLevelsAndNames.join("\n-"))}
                    `)
                ]
            })
        }

        async function handleEmbed() {
            const historyEmbed = new Discord.MessageEmbed();
            const opts = {
                components: [row],
                embeds: [
                    historyEmbed
                        .setTitle(player.platform == 'Bedrock' ? `${player.name}${player.xbox.realName.length ? ` (${player.xbox.realName})` : ''}` : `${player.towny.prefix || ''}` + player?.name || 'Unknown Player')
                        .setURL(player.platform == 'Bedrock' ? encodeURI(`https://xboxgamertag.com/search/${apiResponse.username}`) : `https://namemc.com/profile/${player.uuid}`)
                        .setDescription(`
            **Title**: ${player.towny.title || 'None, they have no swags'} 
            **Surname**: ${player.towny.surname || 'None'}
            **Description**: ${player.xbox && player.description == "The Edge Lord" ? player.xbox.bio : player.description}
            **Platform**: ${player?.platform || "Unknown"}${player.xbox ? `
            **Gamerscore**: ${Number(player.xbox.gamerscore).toLocaleString()}
            **Location**: ${player.xbox.location || 'Easy SMP'}` : ''}
            **Balance**: ${Math.round(player.balance).toLocaleString() || 'Literally nothing, I wonder how it feels to be poor!'}
            **Registered**: ${player?.creation || "Unknown"}
            ${player.online ? `**Online**: Yes, has been online for ${player.metadata.onlineFor} (${player.metadata.afk ? 'AFK' : 'NOT AFK'})` : `**Last Online**: ${player?.lastOnline || "Unknown"}`}
            ${player?.nameHistory && player?.nameHistory[0] ? `
            **Past usernames**: ${player.nameHistory.join(", ")}
            ` : ''}${player.online ? `\n- **Advancements**: ${player.advancements.progress}
            - **Advancements to be Completed**: ${player.advancements.toBeCompleted}\n` : ''}
            **Linked Account**: ${player.discord?.user ? player.discord.user.tag : "None"}
            **Infractions**: ${player.punishmentHistory.filter(x => x.punishmentType !== "TEMP_WARNING")?.length ? `${player.punishmentHistory.filter(x => x.punishmentType !== "TEMP_WARNING")?.length + 1} (${pasteLink?.result?.url ? pasteLink?.result?.url : 'Error?'})` : "0"}
            **Banned**: ${player?.banned ? 'Yes' : 'No'} ${player.banned ? `\n- Reason: ${player.banned.reason}\n- Banned on: ${prettyPrint(new Date(player.banned.created))}\n- Expires: ${player.banned.expires ? relativeTime(new Date(player.banned.expires)) : 'Probably never.'}\n` : ''}
            **Ranks**: ${player.ranks ? capitalize(player.ranks.join(", ")) : 'Default'}
            
            **Friends**: 
            # ${player?.friends && player?.friends[0] || "Has no friends, typical."}
            **Town**:
                👥 **Name**: ${player?.town?.id || 'None'}
                👥 **Ranks**: ${player?.town?.exists ? player?.town?.ranks?.join(", ") || 'Resident' : 'Nomad'}
                👥 **Joined**: ${player?.town?.joinedAt ? player.town.joinedAt : player?.town?.exists ? "Unknown, perhaps they joined this town before this feature was added?" : "trashy nomad L"}
            `)
                        .setThumbnail(`https://api.tydiumcraft.net/skin?uuid=${player?.uuid}&direction=left`)
                        .setColor("RANDOM")
                        .setFooter(`One of the thousands of players Easy SMP has processed.`)
                ]
            }
            opts.content = sass.random();
            send(opts);


        }

    }
};