module.exports = async (client, message) => {
	const { CommandHandler } = client;
	CommandHandler.handleCommand(message);
};
