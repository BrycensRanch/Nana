const {EntitySchema} = require("typeorm"); // import {EntitySchema} from "typeorm";
const {TownSettings} = require("../sqliteModel/TownSettings"); // import {Punishment} from "../model/Punishment";

module.exports = new EntitySchema({
    tableName: "TownSettings",
    target: TownSettings,
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true // auto_increment
        },
        name: {
            type: "varchar"
        },
        guild: {
            type: "text"
        },
    }
});