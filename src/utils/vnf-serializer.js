export class VnfSerializer {
    static serializeValue(value) {
        if(typeof value == "string") return "S" + value;

        return "J" + JSON.stringify(value);
    }

    static deserializeValue(value) {
        if(value == null || value == "") return value;

        var formatType = value.charAt(0);
        var message = value.substr(1);

        if(formatType == "S") return message;
        if(formatType == "J") return JSON.parse(message);

        throw new Error("Unexpected message format: '" + formatType + "', for message: " + message);
    }
}
