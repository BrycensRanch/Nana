const Discord = require('discord.js');
const axios = require('axios').default;  
const yaml = require('js-yaml')
function percentage(partialValue, totalValue) {
  return (100 * partialValue) / totalValue;
} 
const capitalize = (text) => {
  text = text.toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ');
  const arr = text.split(' ');
  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i][0].toUpperCase() + arr[i].substr(1);
}
return arr.join(" ");
};
const normalizeAbilities = (arr) => {
  arr?.forEach(function(value, index) {
    this[index] = capitalize(value.toLowerCase());
  }, arr); // use arr as this
  return arr;
}
const mobMappings = require('../mappings.json');
const stringSimilarity = require("string-similarity");
const item = require('./item');

  module.exports = {
    name: "boss",
    description: "Search the Infernal Mobs Reloaded wiki for boss stats!",
    aliases: [],
    ownerOnly: false, 
    nsfwOnly: false, 
    guildOnly: false,
    arguments: [
      {
        name: "infernal",
        type: "string",
        description: "Enter Infernal to search",
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
      const sass = require('../sass.json').success
      const runningAsInteraction = message instanceof Discord.Interaction;
      var lastMessage;
      var send = (whatever) => {
        if (runningAsInteraction) {

            message.reply(whatever).then((m) => {
              lastMessage = m
          })
          .catch(console.error)
        }
        else {
          message.channel.send(whatever).then((m) => {
            lastMessage = m
        })
        .catch(console.error)
        }
      }
      var response;
      try {
        response = await axios.get('https://raw.githubusercontent.com/Romvnly-Gaming/InfernalMobsReloaded/master/mobs.yml')
        if (!response || !response?.data) throw new TypeError();
      }
      catch(e) {
        console.error(error);
        return send("Oh dang it! I ran into a stupid error. Perhaps GitHub is down?")
      }
        const bossData = yaml.load(response.data);
        var bossName = parsedArgs?.join(" ")?.toLowerCase().replace(/ /g,"_") || Object.keys(bossData).random();
        var boss = bossData[bossName];
        if (!boss) {
          const targets = stringSimilarity.findBestMatch(capitalize(bossName), normalizeAbilities(Object.keys(bossData)))
          const filter = i => i.customId === 'yes' && i.user.id === message.author.id;

          const collector = message.channel.createMessageComponentCollector({ filter, time: 15000 });
        /** 
     * @param {Discord.ButtonInteraction} i 
    */
     collector.on('collect', async i => {
      if (i.customId === 'yes') {
        boss = bossData[targets.bestMatch.target.toLowerCase().replace(/ /g,"_")];
        bossName = targets.bestMatch.target.toLowerCase().replace(/ /g,"_")
        await handleEmbed();
      }
    });
    if (targets.bestMatch.rating >= 0.6) {
      boss = bossData[targets.bestMatch.target.toLowerCase().replace(/ /g, "_")];
      bossName = targets.bestMatch.target.toLowerCase().replace(/ /g, "_")
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
      return send("Couldn't find any Ancient Infernal under the name: " + `\`${bossName}\``)
  }
        }
        await handleEmbed()
        async function handleEmbed() {
        const bossDisplayName = capitalize(bossName);
        const bossEmbed = new Discord.MessageEmbed();
        if (runningAsInteraction) console.log(message.options);
        boss.image = mobMappings[bossDisplayName] || mobMappings[capitalize(boss.type)];
        if (boss.image) bossEmbed.setThumbnail(boss.image)
        const opts = {
          embeds: [
            bossEmbed
            .setTitle(bossDisplayName + " " + `(${capitalize(boss.type)})`)
            .setDescription(`
            **Spawn Chance**: ${Math.round(100 * boss['spawn-chance'])}%

            **Forced Abilities**: 
            - ${normalizeAbilities(boss['forced-abilities'])?.join("\n- ") || 'None, fully RNG!'}

            **Blacklisted Abilities**: 
            - ${normalizeAbilities(boss['blacklisted-abilities'])?.join("\n- ") || 'None, fully RNG!'}

            **Ability Amount**: ${boss['ability-amount'] || 'Unknown'}
            ${boss['forced-abilities'] ? `**Forced Abilities**: ${boss['forced-abilities'].join(', ')}\n` : ''}${boss['blacklisted-abilities'] ? `**Blacklisted Abilities**: ${boss['blacklisted-abilities'].join(', ')}\n` : ''}
            **Loot Table**: 
            - ${boss['loot-table']?.map(x => `${capitalize(x.split(":")[0])} (${Math.round(Number(x.split(":")[1]) * 100)}% Chance)`).join("\n- ") || 'None, only drops stuff from global_drops.yml'}
            —————————————
            **Modifiers**: 
            - Has ${boss['follow-range-multiplier'] || 0} times the normal range of a ${capitalize(boss.type)}
            - Has ${boss['health-multiplier'] || 0} times the normal health of a ${capitalize(boss.type)}
            - Does ${boss['damage-multiplier'] || 0} times the normal damage of a ${capitalize(boss.type)}
            `)
           .setColor("RANDOM")
           .setFooter(`One of the ${Object.keys(bossData).length} Infernals`)
          ],
          components: []
        }
        opts.content = sass.random();
        send(opts);
      }
    }
  };