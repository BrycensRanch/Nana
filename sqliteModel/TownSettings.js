/*export */ class TownSettings {
    constructor(id, name, guild, settings) {
        this.id = id; // town 'id'
        this.name = name; // town name, fancy and all dat
        this.guild = guild; // linked guild 
        Object.assign(this, settings)

    }
}

module.exports = {
    TownSettings: TownSettings
};