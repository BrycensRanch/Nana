
const colors = require("colors");
const axios = require('axios');
const Discord = require('discord.js')
/** 
 * @param {Discord.Client} client discord.js client
 */
module.exports = async (client) => {
const res = client.application;
    client.botInfo = res;
    if (res.owner?.constructor.name == 'Team') {
      client.botAdmins = res.owner.members.map(x => x.user.id);
    }
    else {
      client.botAdmins = [];
      client.botAdmins.push(res.owner?.user.id || '387062216030945281');
    }
    client.user.setActivity(`Easy SMP`, {type: 'WATCHING'});
    client.slashCommands = await client.application.commands.set(client._slashCommands)
    console.log(colors.brightRed('The bot has successfully started.\n---\n'
    +`Serving ${client.users.cache.size} users, ${client.botAdmins.length} bot admins, ${client.channels.cache.size} channels, and ${client.guilds.cache.size} guilds with ${client.commands.size} commands!`));
    client.tempDir = require('path').join(await require('fs').promises.realpath(require('os').tmpdir()), 'Nana')
    console.log(client.tempDir)

}