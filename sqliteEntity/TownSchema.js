const { EntitySchema } = require('typeorm'); // import {EntitySchema} from "typeorm";
const { TownSettings } = require('../sqliteModel/TownSettings'); // import {Punishment} from "../model/Punishment";

module.exports = new EntitySchema({
	columns: {
		guild: {
			type: 'text',
		},
		id: {
			generated: true,
			primary: true,
			type: 'int', // auto_increment
		},
		name: {
			type: 'varchar',
		},
	},
	tableName: 'TownSettings',
	target: TownSettings,
});
