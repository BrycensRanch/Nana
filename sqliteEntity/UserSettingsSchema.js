const { EntitySchema } = require('typeorm'); // import {EntitySchema} from "typeorm";
const { UserSettings } = require('../sqliteModel/UserSettings'); // import {UserSettings} from "../sqliteModel/UserSettings";

module.exports = new EntitySchema({
	columns: {
		description: {
			length: 300,
			type: 'varchar',
		},
		discord: {
			length: 32,
			type: 'varchar',
		},
		id: {
			generated: true,
			primary: true,
			type: 'int', // auto_increment
		},
		uuid: {
			type: 'varchar',
			unique: true,
		},
	},
	tableName: 'UserSettings',
	target: UserSettings,
});
