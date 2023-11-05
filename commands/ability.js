const Discord = require('discord.js');
const axios = require('axios').default;
const yaml = require('js-yaml')

function percentage(partialValue, totalValue) {
    return (100 * partialValue) / totalValue;
}
const capitalize = (text) => {
    text = text?.toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ');
    const arr = text?.split(' ');
    for (let i = 0; i < arr.length; i++) {
        arr[i] = arr[i][0]?.toUpperCase() + arr[i]?.substr(1);
    }
    return arr?.join(" ");
};
const normalizeAbilities = (arr) => {
    arr?.forEach(function(value, index) {
        this[index] = capitalize(value.toLowerCase());
    }, arr); // use arr as this
    return arr;
}
const minecraftToDiscord = (str) => {
    return str.replace(/§.{1}/g, '').replace(/&.{1}/g, '').replace(/(?:#)[0-9a-f]{8}|(?:#)[0-9a-f]{6}|(?:#)[0-9a-f]{4}|(?:#)[0-9a-f]{3}/ig, '')
}

const stringSimilarity = require("string-similarity");
const rangeParser = require("parse-numeric-range");

function romanize(num) {
    if (isNaN(num) && !isNaN(Number(num))) num = Number(num);
    if (isNaN(num)) {
        const range = rangeParser(num)
        return `${romanize(range[0])} to ${romanize(range.at(-1))}`;
    }
    var digits = String(+num).split(""),
        key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
               "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
               "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
        roman = "",
        i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
}
const sass = require('../sass.json').success
module.exports = {
    name: "ability",
    description: "Search the Infernal Mobs Reloaded wiki for Infernal ability stats!",
    aliases: [],
    ownerOnly: false,
    nsfwOnly: false,
    guildOnly: false,
    arguments: [
        {
            name: "ability",
            type: "string",
            description: "Enter Infernal ability to search",
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
    async execute(message, args, client, flags, parsedArgs) {
        const runningAsInteraction = message instanceof Discord.Interaction;
        var lastMessage;
        /** 
         * @param {Discord.Message} whatever Message class
         */
        var send = (whatever) => {
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
        var response;
        var response2;
        var response3;
        try {
            response = await axios.get('https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/mobs.yml')
            if (!response || !response?.data) throw new TypeError();
            response2 = await axios.get('https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/config.yml')
            if (!response2 || !response2?.data) throw new TypeError();
            response3 = await axios.get('https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/abilities.yml')
            if (!response3 || !response3?.data) throw new TypeError();
        } catch (e) {
            console.error(e);
            return send("Oh dang it! I ran into a stupid error. Perhaps GitHub is down?")
        }
        var bossData;
        var configData;
        var abilityData;
        try {
            bossData = yaml.load(response.data);
            configData = yaml.load(response2.data);
            abilityData = yaml.load(response3.data)
        } catch (e) {
            console.error(e);
            return send("I couldn't parse the configuration files from InfernalMobsReloaded!\n```" + e.toString() + "```")
        }
        //   console.log(bossData.filter(x => x['loot-table'][0]))
        var abilityName = parsedArgs?.join(" ")?.toLowerCase().replace(/ /g, "-") || Object.keys(abilityData).random();
        var ability = abilityData[abilityName];
        if (!ability) {
            const targets = stringSimilarity.findBestMatch(capitalize(abilityName), normalizeAbilities(Object.keys(abilityData)))
            const filter = i => i.customId === 'yes' && i.user.id === message.author.id;

            const collector = message.channel.createMessageComponentCollector({
                filter,
                time: 15000
            });

            collector.on('collect', async i => {
                console.log('collected', i)
                if (i.customId === 'yes') {
                    ability = abilityData[targets.bestMatch.target.toLowerCase().replace(/ /g, "-")];
                    abilityName = targets.bestMatch.target.toLowerCase().replace(/ /g, "-")
                    await handleEmbed();
                }
            });
            if (targets.bestMatch.rating >= 0.6) {
                ability = abilityData[targets.bestMatch.target.toLowerCase().replace(/ /g, "-")];
                abilityName = targets.bestMatch.target.toLowerCase().replace(/ /g, "-")
            } else if (targets.bestMatch.rating <= 0.5 && targets.bestMatch.rating > 0.1) {
                const row = new Discord.MessageActionRow()
                    .addComponents(
                        new Discord.MessageButton()
                        .setCustomId('yes')
                        .setLabel('Yes')
                        .setStyle('SUCCESS')
                    );
                send({
                    content: `Did you mean \`${targets.bestMatch.target}\`? (${Math.round(100 * targets.bestMatch.rating)}% Match)`,
                    components: [row]
                })
                return send = (whatever) => {
                    if (runningAsInteraction) {
                        message.editReply(whatever)
                    } else {
                        lastMessage.edit(whatever)
                    }
                }
            } else {
                return send("Couldn't find any Ancient Infernal ability under the name: " + `\`${abilityName}\``)
            }
        }
        await handleEmbed()
        async function handleEmbed() {
            const props = []
            for (const [key, value] of Object.entries(abilityData[abilityName])) {
                if (key === 'Description') continue;
                props.push(`${capitalize(key)}: ${value}`)
            }
            const canHaveAbilityList = Object.entries(bossData)
            .filter(x => !x[1]['blacklisted-abilities']?.includes(abilityName.toUpperCase()))
            .map(x => `${capitalize(x[0])}`)
            const abilityEmbed = new Discord.MessageEmbed();
            const opts = {
            components: [],
            embeds: [
            abilityEmbed
            .setTitle(capitalize(abilityName))
            .setDescription(`
            **Description**: ${ability.Description || 'None.. Must of been lost to the ages of time.'}
            **Disabled**: ${configData['disabled-abilities']?.includes(abilityName) ? 'Yes' : 'No'}
            **Properties**: 
            - ${props.join("\n- ")}
            **Can be used by**:
            - ${canHaveAbilityList.join("\n- ")}
            `)
           .setColor("RANDOM")
           .setFooter(`One of the ${Object.keys(abilityData).length} abilties for Infernal Mobs`)
          ]
            }
            opts.content = sass.random();
            send(opts);
        }

    }
};