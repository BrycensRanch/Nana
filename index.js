// Packages
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildMembers,
	],
});
const commandhandler = require('./CommandHandler');
const DM = require('./DatabaseManager');
const colors = require('colors');
const figlet = require('figlet');

// Configuration
const { token, prefix } = require('./config.json');

// Messing around with JavaScript! HAHAHAHAHA
Array.prototype.random = function () {
	return this[Math.floor(Math.random() * this.length)];
};
String.prototype.isEmpty = function () {
	// This doesn't work the same way as the isEmpty function used
	// in the first example, it will return true for strings containing only whitespace
	return this.length === 0 || !this.trim();
};

const CommandHandler = new commandhandler(
	client,
	prefix, // Bot prefix to default to...
	// './commands' defaults you can change if you wish... these are defined at the command handler level.
	// './events'
);
Object.defineProperty(client, 'config', {
	enumerable: false,
	value: require('./config.json'),
	writable: true,
});
// Provide the DatabaseManager with our base.
// It's important that the DatabaseManager has access to our client config without needing to require our config file for the future and best practice.
const DatabaseManager = new DM(client);

Object.defineProperty(client, 'CommandHandler', {
	enumerable: false,
	value: CommandHandler,
	writable: true,
});

Object.defineProperty(client, 'DatabaseManager', {
	enumerable: false,
	value: DatabaseManager,
	writable: true,
});

// Basic client utility functions, anything that requires a module shouldn't be placed here or 100+ lines of code.
client.utils = {
	whatIsTomorrow: () => {
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow;
	},
};
client.slashCommands = [];
client._slashCommands = [];
(async function () {
	console.log(colors.brightRed(figlet.textSync('NANA', { horizontalLayout: 'full' })));
	if (process.env.pm_id)
		console.log(colors.green(figlet.textSync('RUNNING UNDER PM2', { horizontalLayout: 'full' })).italic);
	console.log('Connecting to Databases...');
	await DatabaseManager.connect();
	console.log('Registering commands & events...');
	await CommandHandler.registerEvents('./events');
	await CommandHandler.registerCommands('./commands'); // changeable if u wish, it has these defaults
	// and tbh the function doesnt exactly need you to specify it since it can be defined at command handler level.
})();

// Bot Login
// TOKEN variable takes precedence over the configured token if it exists.
client.login(process.env.TOKEN || token);
