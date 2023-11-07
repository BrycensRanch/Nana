const { EntitySchema } = require('typeorm'); // import {EntitySchema} from "typeorm";
const { Punishment } = require('../model/Punishment'); // import {Punishment} from "../model/Punishment";

module.exports = new EntitySchema({
	columns: {
		calculation: {
			type: 'varchar',
		},
		end: {
			type: 'mediumtext',
		},
		id: {
			generated: true,
			primary: true,
			type: 'int', // auto_increment
		},
		name: {
			type: 'varchar',
		},
		operator: {
			type: 'varchar',
		},
		punishmentType: {
			type: 'varchar',
		},
		reason: {
			type: 'varchar',
		},
		start: {
			type: 'mediumtext',
		},
		uuid: {
			type: 'varchar',
		},
	},
	tableName: 'Punishments',
	target: Punishment,
});
