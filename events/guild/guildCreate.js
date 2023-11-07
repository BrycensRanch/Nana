const Discord = require('discord.js');
/**
 * @param {Discord.Client} client discord.js client
 * @param {Discord.Guild} guild guild joined
 */
module.exports = async (client, guild) => {
	console.log(`Joined a new guild: ${guild.name} (${guild.id})`);
	// const feed = client.channels.cache.get('724005564824158238');
	// const owner = await client.users.fetch(guild.ownerID);
	// if (!feed) return;
	// feed.send(`Joined a new guild: \`${guild.name} (${guild.id})\`\nThe owner of this guild is ${owner.tag} (${owner.id})\n${guild.name} is now apart of the ${client.guilds.cache.size} guilds ${client.user.tag} acts as a shield on. `).catch(err => {
	//   console.log(`Couldn't alert the support server of changes!`)
	// })
};
