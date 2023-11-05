const {EntitySchema} = require("typeorm"); // import {EntitySchema} from "typeorm";
const {UserSettings} = require("../sqliteModel/UserSettings"); // import {UserSettings} from "../sqliteModel/UserSettings";

module.exports = new EntitySchema({
    tableName: "UserSettings",
    target: UserSettings,
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true // auto_increment
        },
        discord: {
            type: "varchar",
            length: 32
        },
        uuid: {
            type: "varchar",
            unique: true
        },
        description: {
            type: "varchar",
            length: 300
        },
    }
});