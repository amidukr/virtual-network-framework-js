function splitToArray(stringValue, number) {
    var result = [];

    var prevSpaceIndex = -1;

    for(var i  = 0; i < number - 1; i++) {
        var spaceIndex = stringValue.indexOf(' ', prevSpaceIndex + 1);

        if(spaceIndex == -1) {
            throw new Error("Unable split string into " + number + " parts. String value is: '" + stringValue + "'");
        }

        result[i] = stringValue.substr(prevSpaceIndex  + 1, spaceIndex - prevSpaceIndex  - 1);

        prevSpaceIndex = spaceIndex;
    }

    result[result.length] = stringValue.substr(spaceIndex+1);

    return result;
}

export class ReliableMessageSerializer {
    static serialize (message) {
        if(message.type == 'MESSAGE') {
            return 'MESSAGE ' + message.toSid + ' ' + message.messageIndex + ' ' + message.payload;
        }

        if(message.type == 'HEARTBEAT') {
            return 'HEARTBEAT ' + message.toSid + ' ' + message.fromSid + ' ' + message.gapBegin + ' ' + message.gapEnd;
        }

        if(message.type == 'HANDSHAKE') {
            return 'HANDSHAKE ' + message.fromSid;
        }

        if(message.type == 'ACCEPT') {
            return 'ACCEPT ' + message.toSid + ' ' + message.fromSid;
        }

        if(message.type == 'CLOSE-CONNECTION') {
            return 'CLOSE-CONNECTION ' + message.toSid + ' ' + message.fromSid;
        }

        throw new Error("Unexpected type: '" + message.type + "' to serialize");
    }

    static deserialize (stringValue) {
        var messageTypeIndex = stringValue.indexOf(' ');
        var type = stringValue.substr(0, messageTypeIndex);

        var remainString = stringValue.substr(messageTypeIndex + 1);

        if(type == 'MESSAGE') {
            var messageValues = splitToArray(remainString, 3);

            return {
                type: 'MESSAGE',
                toSid:         messageValues[0],
                messageIndex:  messageValues[1] - 0,
                payload:       messageValues[2]
            };
        }

        if(type == 'HEARTBEAT') {
            var messageValues = splitToArray(remainString, 4);

            return {
                type: 'HEARTBEAT',
                toSid:    messageValues[0],
                fromSid:  messageValues[1],
                gapBegin: messageValues[2] - 0,
                gapEnd:   messageValues[3] - 0
            };
        }

        if(type == 'HANDSHAKE') {
            return {
                type: 'HANDSHAKE',
                fromSid: remainString
            };
        }

        if(type == 'ACCEPT') {
            var messageValues = splitToArray(remainString, 2);

            return {
                type: 'ACCEPT',
                toSid:   messageValues[0],
                fromSid: messageValues[1]
            };
        }

        if(type == 'CLOSE-CONNECTION') {
            var messageValues = splitToArray(remainString, 2);

            return {
                type: 'CLOSE-CONNECTION',
                toSid:    messageValues[0],
                fromSid:  messageValues[1]
            };
        }

        throw new Error("Unexpected type: '" + type + "' to deserialize");
    }
}
