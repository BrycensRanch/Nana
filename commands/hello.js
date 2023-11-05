const Discord = require('discord.js');
  
  module.exports = {
    name: "hello",
    description: "",
    aliases: [],
    ownerOnly: false, 
    nsfwOnly: false, 
    guildOnly: false,
    specialGuilds: null, // Array of guild IDs that this command can be ran in.
    examples: [],
    /** 
     * @param {Discord.Message} message Message class
     * @param {Array} args User provided arguments.
     * @param {Discord.Client} client Discord.js client
     * @param {Object} flags User provided flags
     * @param {Array} parsedArgs Parsed arguments like "discord epic" are seen as one argument.
    */
    async execute(message, args, client, flags, parsedArgs) {
        // !hello "im a living legend" -msg=3 --ubi
        console.log(message.author.tag, args, client.user.tag, flags, parsedArgs);
        // Expected output: 
        // Romvnly#5369 [ '"im', 'a', 'living', 'legend"' ] pogchamp#3970 { msg: '3', ubi: true } [ 'im a living legend' ]
        return await message.channel.send("Hello, beautiful world!");
    }
  };