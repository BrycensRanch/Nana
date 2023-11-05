const { exec } = require("child_process");
const Discord = require('discord.js');
  
  
  module.exports = {
    name: "restart",
    description: "Restart Nana",
    examples: ['restart my love for coding'],
    ownerOnly: true,
    /** 
     * @param {Discord.Message} message 
     * @param {Discord.Client} client
    */
    async execute(message, [], client, flags) {
     await message.channel.send("👋 | See ya, wouldn't wanna be ya!").catch(() => null);
     client.destroy();
     if (flags.pm2) {
      exec(`pm2 restart ${process.env.pm_id}`);
     }
     else {
      process.exit(69);
     }
    }
  };