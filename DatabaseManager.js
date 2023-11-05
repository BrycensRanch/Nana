// Dependencies
const {
    Client
} = require("discord.js");
const typeorm = require("typeorm"); // import * as typeorm from "typeorm";
const {
    EventEmitter
} = require("events");
const axios = require("axios");
const sftp = require("ssh2-sftp-client");
const path = require("path");


const {
    LinkedAccount
} = require("./model/LinkedAccount");
const {
    Punishment
} = require("./model/Punishment");


// Required by TypeORM for some reason
require("reflect-metadata");

class DatabaseManager extends EventEmitter {
    /** 
     * @param {Client} client 
     */
    constructor(client) {
        super()
        if (!client) throw new TypeError("No Discord.Client provided");
        if (!client instanceof Client) throw new TypeError("Specified client must be a DiscordClient (discord.js)");
        this.client = client;
    }
    async connect() {
        await typeorm.createConnections(require("./ormconfig.json"));
        Object.defineProperty(this.client, "db", {
            enumerable: false,
            writable: true,
            value: typeorm.getConnection("mysql")
        });
        Object.defineProperty(this.client, "db2", {
            enumerable: false,
            writable: true,
            value: typeorm.getConnection("sqlite3")
        });
    }
    async getLinkedAccount(params) {
        const linkedAccountRepo = this.client.db.getRepository(LinkedAccount)
        switch (typeof params) {
            case 'object':
                return await linkedAccountRepo.findOneBy(params);
            case 'string':
                if (/\d{17,23}/.test(params)) {
                    return await linkedAccountRepo.findOneBy({
                        discord: params
                    });
                }
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params) || params.startsWith("00000000-0000-0000-000")) {
                    return await linkedAccountRepo.findOneBy({
                        uuid: params
                    });
                }
                throw new TypeError(`${typeof params} (${params}) did not provide proper user identification`)
            default:
                // code block
                throw new TypeError(`${typeof params} (${params}) isn't supported as a param.`)
        }

    }
    // dead code for some reason...
    async getUserPunishments(params) {
        const linkedAccountRepo = this.client.db.getRepository(LinkedAccount);
        const punishmentRepo = this.client.db.getRepository(Punishment)
        switch (typeof params) {
            case 'object':
                return await punishmentRepo.findOne(params);
                break;
            case 'string':
                if (/\d{17,23}/.test(params)) {
                    return await linkedAccountRepo.findOne({
                        discord: params
                    });
                }
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params) || params.startsWith("00000000-0000-0000-000")) {
                    return await linkedAccountRepo.findOne({
                        uuid: params
                    });
                }
                throw new TypeError(`${typeof params} (${params}) did not provide proper user identification`)
            default:
                // code block
                throw new TypeError(`${typeof params} (${params}) isn't supported as a param.`)
        }
    }
    // This method does NOT touch our databases, but instead queries our RestAPI for Placeholders. 
    // It's here because Towny's flat file system is considered as a database.
    async getUserTownInfo(uuid, town) {
        if (!uuid && !town) throw new TypeError("No UUID given.");

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params) && !params.startsWith("00000000-0000-0000-000") && uuid) {
            throw new TypeError(`Invalid UUID! Provided: ${typeof uuid} (${uuid})`)
        }
        // Our RESTAPI is authenticated and uses some weird token system. 
        const options = {
            headers: {
                "Token": this.client.config.restAPIKey
            }
        }
        if (uuid && !town) {
            var hasTown = await axios.get(`https://api.2v1.me/${uuid}/townyadvanced_town`, options)
            hasTown = !hasTown?.data?.message?.isEmpty() ? !hasTown?.data?.message : null;
            // Returning false is a nice way of telling whoever asked for the information to read a book!
            if (!hasTown) return false;
        }
        const responses = await axios.all([
        axios.get(`https://api.2v1.me/${uuid}/townyadvanced_towny_name_prefix`, options),
        axios.get(`https://api.2v1.me/${uuid}/townyadvanced_towny_name_prefix`, options)
    ])
    try {
            const otherOptions = {
                agent: process.env.SSH_AUTH_SOCK,
                debug: (e) => console.debug(e)
            }
            const optionsWithExtra = {
                ...client.config.sshLogin,
                ...otherOptions
            }
        await sftp.connect(optionsWithExtra)
    } catch (e) {
        if (e.message == "An existing SFTP connection is already defined") {
            sftp.end().catch(() => null)
        } else if (!e instanceof TypeError) throw e;
    }
    const townFilePath = path.join("/home/mcuser/minecraft/plugins/Towny/data/towns", "")
    const townFileExists = await sftp.exists(townFilePath)
    if (!townyFileExists) return send("There was no towny playerdata found for this player, perhaps they've never played on Easy SMP?")
    await sftp.get(townFilePath, localPlayerPath)
    sftp.end().then(() => null).catch(() => null)

    }
}

module.exports = DatabaseManager;