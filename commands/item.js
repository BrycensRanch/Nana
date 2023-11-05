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
    name: "item",
    description: "Search the Infernal Mobs Reloaded wiki for item stats!",
    aliases: [],
    ownerOnly: false,
    nsfwOnly: false,
    guildOnly: false,
    arguments: [
        {
            name: "item",
            type: "string",
            description: "Enter Item to search",
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
        const runningAsInteraction = message instanceof Discord.BaseInteraction;
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
        var response4;
        try {
            response = await axios.get('https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/mobs.yml')
            if (!response || !response?.data) throw new TypeError();
            response2 = await axios.get('https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/loot_table.yml')
            if (!response2 || !response2?.data) throw new TypeError();
            response3 = await axios.get('https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/global_drops.yml')
            if (!response3 || !response3?.data) throw new TypeError();
            response4 = await axios.get('https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/charms.yml')
            if (!response4 || !response4?.data) throw new TypeError();
        } catch (e) {
            console.error(e);
            return send("Oh dang it! I ran into a stupid error. Perhaps GitHub is down?")
        }
        var bossData;
        var itemData;
        var globalData;
        var charmData;
        try {
            bossData = yaml.load(response.data);
            itemData = yaml.load(response2.data);
            globalData = yaml.load(response3.data);
            charmData = yaml.load(response4.data);
        } catch (e) {
            console.error(e);
            return send("I couldn't parse the configuration files from InfernalMobsReloaded!\n```" + e.toString() + "```")
        }
        //   console.log(bossData.filter(x => x['loot-table'][0]))
        var itemName = parsedArgs?.join(" ")?.toLowerCase().replace(/ /g, "_") || Object.keys(itemData).random();
        var item = itemData[itemName];
        if (!item) {
            const targets = stringSimilarity.findBestMatch(capitalize(itemName), normalizeAbilities(Object.keys(itemData)))
            const filter = i => i.customId === 'yes' && i.user.id === message.author.id;

            const collector = message.channel.createMessageComponentCollector({
                filter,
                time: 15000
            });

            collector.on('collect', async i => {
                console.log('collected', i)
                if (i.customId === 'yes') {
                    item = itemData[targets.bestMatch.target.toLowerCase().replace(/ /g, "_")];
                    itemName = targets.bestMatch.target.toLowerCase().replace(/ /g, "_")
                    await handleEmbed();
                }
            });
            if (targets.bestMatch.rating >= 0.6) {
                item = itemData[targets.bestMatch.target.toLowerCase().replace(/ /g, "_")];
                itemName = targets.bestMatch.target.toLowerCase().replace(/ /g, "_")
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
                return send("Couldn't find any Ancient Infernal Item under the name: " + `\`${itemName}\``)
            }
        }
        await handleEmbed()
        async function handleEmbed() {
            const mobDroppers = Object.entries(bossData).filter(x => x[1]['loot-table'].filter(l => l.includes(itemName))[0]).map((x, i) => `${capitalize(x[0])} (${Math.round(Number(x[1]['loot-table'].filter(loot => loot.includes(itemName)).join(", ").split(":")[1]) * 100)}% Chance)`)
            const isGlobalDrop = globalData['global-drops'].filter(d => d.includes(itemName))[0]
            if (isGlobalDrop) mobDroppers.push(`Any Infernal (${Number(capitalize(globalData['global-drops'].filter(d => d.includes(itemName))[0].split(":")[1])).toFixed(10) * 100}% Chance)`)
            const itemEmbed = new Discord.EmbedBuilder();
            const opts = {
            components: [],
            embeds: [
            itemEmbed
            .setTitle(capitalize(itemName) + " " + `(${capitalize(item.material)})`)
            .setDescription(`
            **Display Name**: ${item.name || capitalize(itemName)}${item.amount && item.amount !== '1' && item.amount !== undefined && item.amount !== "undefined" ?  '' : `\n**Amount**: ${item.amount || '1'}`}
            **Obtainable**: ${!mobDroppers[0] && !isGlobalDrop ? 'No' : 'Yes'}
            **Lore**: 
            ${item?.lore && item.lore[0] ? !item.lore.forEach((x, i) => item.lore[i] = minecraftToDiscord(x)) && item.lore.join("\n") : 'None, lost to the ages'}
            **Effects**: 
            - ${Object.entries(charmData['charm-effects']).filter(x => x[1]['required-items']?.includes(itemName) || x[1]['main-hand'] == itemName).map(x => `${capitalize(x[1].effect)} ${romanize(x[1].potency)} [Type: ${capitalize(x[1]['effect-mode'] || 'SELF_PERMANENT')} | Duration: ${x[1].duration || 'PERM'} | Delay: ${x[1].delay || 1}] `).join("\n- ") || 'Nothing...'}
            **Enchants**: 
            - ${item.enchants?.map((x) => `${capitalize(x.split(":")[0])} ${x.split(":")[1] == '1' ? "" : romanize(x.split(":")[1])} (${Math.round(x.split(":")[2] * 100|| 100)}% Chance)`).join("\n- ") || 'Nothing...'}
            ${mobDroppers[0] ? '**Dropped by**:\n - ' + mobDroppers.join("\n- ") : ''}
            `)
           .setColor(Discord.Colors.Blurple)
           .setFooter({
               text: `One of the ${Object.keys(itemData).length} items for Infernal Mobs Reloaded`
           })
            // **Ability Amount**: ${boss['ability-amount'] || 'Unknown'}

            // **Loot Table**: 
            // - ${boss['loot-table']?.join("\n- ") || 'None, only drops stuff from global_drops.yml'}
            // —————————————
            // **Modifiers**: 
            // - Has ${boss['follow-range-multiplier'] || 0} times the normal range of a ${capitalize(boss.type)}
            // - Has ${boss['health-multiplier'] || 0} times the normal health of a ${capitalize(boss.type)}
            // - Does ${boss['damage-multiplier'] || 0} times the normal damage of a ${capitalize(boss.type)}
          ]
            }
            opts.content = sass.random();
            send(opts);
        }

    }
};