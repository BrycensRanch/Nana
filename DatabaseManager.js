// Dependencies
const { Client } = require('discord.js');
const typeorm = require('typeorm'); // import * as typeorm from "typeorm";
const { EventEmitter } = require('node:events');
const { LinkedAccount } = require('./model/LinkedAccount');

// Required by TypeORM for some reason
require('reflect-metadata');

class DatabaseManager extends EventEmitter {
	/**
	 * @param {Client} client
	 */
	constructor(client) {
		super();
		if (!client) throw new TypeError('No Discord.Client provided');
		if (!client instanceof Client) throw new TypeError('Specified client must be a DiscordClient (discord.js)');
		this.client = client;
	}
	async connect() {
		await typeorm.createConnections(require('./ormconfig.json'));
		Object.defineProperty(this.client, 'db', {
			enumerable: false,
			value: typeorm.getConnection('mysql'),
			writable: true,
		});
		Object.defineProperty(this.client, 'db2', {
			enumerable: false,
			value: typeorm.getConnection('sqlite3'),
			writable: true,
		});
	}
	async getLinkedAccount(parameters) {
		const linkedAccountRepo = this.client.db.getRepository(LinkedAccount);
		switch (typeof parameters) {
			case 'object': {
				return await linkedAccountRepo.findOneBy(parameters);
			}
			case 'string': {
				if (/\d{17,23}/.test(parameters)) {
					return await linkedAccountRepo.findOneBy({
						discord: parameters,
					});
				}
				if (
					/^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(parameters) ||
					parameters.startsWith('00000000-0000-0000-000')
				) {
					return await linkedAccountRepo.findOneBy({
						uuid: parameters,
					});
				}
				throw new TypeError(`${typeof parameters} (${parameters}) did not provide proper user identification`);
			}
			default: {
				// code block
				throw new TypeError(`${typeof parameters} (${parameters}) isn't supported as a param.`);
			}
		}
	}
}

module.exports = DatabaseManager;
