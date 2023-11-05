const { stripIndents } = require(`common-tags`);
const { inspect } = require(`util`);
const Discord = require('discord.js');
module.exports = {
	name: 'eval',
	aliases: [`evaluate`, `run`],
    cooldown: 2,
    ownerOnly: true,
    usage: `eval message.author.id`,
	description: 'Evaluate/Run Javascript Code!',
    /** 
     * @param {Discord.Message} message Message class
     * @param {Array} args User provided arguments.
     * @param {Discord.Client} client Discord.js client
     * @param {Object} flags User provided flags
     * @param {Array} parsedArgs Parsed arguments like "discord epic" are seen as one argument.
    */
	async execute(message, args, client, flags, parsedArgs) {
                let {db} = client;
                if (!args[0]) return message.channel.send(`Please provide some javascript to run, please!`);
                var depthObj = 2;
                if (flags && flags.d) depthObj= parseInt(flags.d);
                try {
                    const start = process.hrtime();
                    let output = eval(args.join(" "));
                    const difference = process.hrtime(start);
                    if (typeof output !== "string") output = inspect(output, {depth: depthObj , maxArrayLength: null});
                    if (output == inspect(client, {depth: depthObj , maxArrayLength: null })) return message.channel.send("```js\nSanitized client object may not be outputed\n```");
                    if (output == inspect(client.config, {depth: depthObj , maxArrayLength: null})) return message.channel.send("```js\nSanitized client object may not be outputed\n```");
                    let initMsg =  await message.channel.send(stripIndents`
                    *Executed in ${difference[0]}s*
                    \`\`\`js
                    ${output.length > 1950 ? chunkString(output.replace(client.token, `[SANITIZED BOT TOKEN]`), 1950) : output.replace(client.token, `[SANITIZED BOT TOKEN]`)}
                    \`\`\`
                    `);
                    function chunkString(str, length=1950) {
                        var chunks = [];
                        var charsLength;
                        for (var i = 0, charsLength = str.length; i < charsLength; i += length) {
                            chunks.push(str.substring(i, i + length));
                        }
                        for (const chunk of chunks) {
                            doReply(chunk);
                        }
                        return chunks;
                    
                    }
                    async function doReply(text) {
                        const start = process.hrtime();
                        if (typeof text !== "string") text = inspect(text, {depth: depthObj , maxArrayLength: null });
                        if (text == inspect(client, {depth: depthObj , maxArrayLength: null })) return message.channel.send("```js\nSanitized client object may not be outputed\n```");
                        if (text == inspect(client.config, {depth: depthObj , maxArrayLength: null })) return message.channel.send("```js\nSanitized client object may not be outputed\n```");
                        const difference = process.hrtime(start);
                        await message.channel.send(`*Callback (${difference[0]}s):*\n\`\`\`js\n${text.length > 1950 ? chunkString(text.replace(client.token, `[SANITIZED BOT TOKEN]`), 1950) : text.replace(client.token, `[SANITIZED BOT TOKEN]`)}\`\`\``);
                    }
                }
                catch(err) {
                    return message.channel.send(stripIndents`
                    Error:
                    \`${err}\`
                    `)
                }
        
    },
}