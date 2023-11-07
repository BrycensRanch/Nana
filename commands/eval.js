const { stripIndents } = require(`common-tags`);
const { inspect } = require(`util`);
const Discord = require('discord.js');
module.exports = {
	aliases: [`evaluate`, `run`],
	cooldown: 2,
	description: 'Evaluate/Run Javascript Code!',
	/**
	 * @param {Discord.Message} message Message class
	 * @param {Array} args User provided arguments.
	 * @param arguments_
	 * @param {Discord.Client} client Discord.js client
	 * @param {object} flags User provided flags
	 * @param {Array} parsedArgs Parsed arguments like "discord epic" are seen as one argument.
	 * @param parsedArguments
	 */
	async execute(message, arguments_, client, flags, parsedArguments) {
		let { db } = client;
		if (!arguments_[0]) return message.channel.send(`Please provide some javascript to run, please!`);
		let depthObject = 2;
		if (flags && flags.d) depthObject = Number.parseInt(flags.d);
		try {
			const start = process.hrtime();
			let output = eval(arguments_.join(' '));
			const difference = process.hrtime(start);
			if (typeof output !== 'string') output = inspect(output, { depth: depthObject, maxArrayLength: null });
			if (output == inspect(client, { depth: depthObject, maxArrayLength: null }))
				return message.channel.send('```js\nSanitized client object may not be outputed\n```');
			if (output == inspect(client.config, { depth: depthObject, maxArrayLength: null }))
				return message.channel.send('```js\nSanitized client object may not be outputed\n```');
			let initMessage = await message.channel.send(stripIndents`
                    *Executed in ${difference[0]}s*
                    \`\`\`js
                    ${
											output.length > 1950
												? chunkString(output.replace(client.token, `[SANITIZED BOT TOKEN]`), 1950)
												: output.replace(client.token, `[SANITIZED BOT TOKEN]`)
										}
                    \`\`\`
                    `);
			/**
			 *
			 * @param string_
			 * @param length
			 */
			function chunkString(string_, length = 1950) {
				let chunks = [];
				var charsLength;
				for (var index = 0, charsLength = string_.length; index < charsLength; index += length) {
					chunks.push(string_.substring(index, index + length));
				}
				for (const chunk of chunks) {
					doReply(chunk);
				}
				return chunks;
			}
			/**
			 *
			 * @param text
			 */
			async function doReply(text) {
				const start = process.hrtime();
				if (typeof text !== 'string') text = inspect(text, { depth: depthObject, maxArrayLength: null });
				if (text == inspect(client, { depth: depthObject, maxArrayLength: null }))
					return message.channel.send('```js\nSanitized client object may not be outputed\n```');
				if (text == inspect(client.config, { depth: depthObject, maxArrayLength: null }))
					return message.channel.send('```js\nSanitized client object may not be outputed\n```');
				const difference = process.hrtime(start);
				await message.channel.send(
					`*Callback (${difference[0]}s):*\n\`\`\`js\n${
						text.length > 1950
							? chunkString(text.replace(client.token, `[SANITIZED BOT TOKEN]`), 1950)
							: text.replace(client.token, `[SANITIZED BOT TOKEN]`)
					}\`\`\``,
				);
			}
		} catch (error) {
			return message.channel.send(stripIndents`
                    Error:
                    \`${error}\`
                    `);
		}
	},

	name: 'eval',

	ownerOnly: true,

	usage: `eval message.author.id`,
};
