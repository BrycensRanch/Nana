/*export */ class Punishment {
    constructor(id, name, uuid, reason, operator, punishmentType, start, end, calculation) {
        this.id = id;
        this.name = name;
        this.uuid = uuid;
        this.reason = reason;
        this.operator = operator;
        this.punishmentType = punishmentType;
        this.start = start;
        this.end = end;
        this.calculation = calculation;
    }
}

module.exports = {
    Punishment: Punishment
};