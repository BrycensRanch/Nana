const {EntitySchema} = require("typeorm"); // import {EntitySchema} from "typeorm";
const {Punishment} = require("../model/Punishment"); // import {Punishment} from "../model/Punishment";

module.exports = new EntitySchema({
    tableName: "PunishmentHistory",
    target: Punishment,
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true // auto_increment
        },
        name: {
            type: "varchar"
        },
        uuid: {
            type: "varchar"
        },
        reason: {
            type: "varchar"
        },
        operator: {
            type: "varchar"
        },
        punishmentType: {
            type: "varchar"
        },
        start: {
            type: "mediumtext"
        },
        end: {
            type: "mediumtext"
        },
        calculation: {
            type: "varchar"
        },
    }
});