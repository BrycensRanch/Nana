const { EntitySchema } = require('typeorm'); // import {EntitySchema} from "typeorm";
const { LinkedAccount } = require('../model/LinkedAccount'); // import {Punishment} from "../model/Punishment";

module.exports = new EntitySchema({
	columns: {
		discord: {
			length: 32,
			type: 'varchar',
		},
		link: {
			generated: true,
			primary: true,
			type: 'int', // auto_increment
		},
		uuid: {
			length: 36,
			type: 'varchar',
		},
	},
	database: 'discordsrv',
	tableName: 'discordsrv_accounts',
	target: LinkedAccount,
});
