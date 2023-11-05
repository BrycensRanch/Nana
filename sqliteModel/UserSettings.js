/*export */ class UserSettings {
    constructor(id, discord, uuid, description) {
        this.id = id; // record id
        this.discord = discord;
        this.uuid = uuid,
        this.description = description || 'The Edge Lord (!description [amazing description])'
    }
}

module.exports = {
    UserSettings: UserSettings
};