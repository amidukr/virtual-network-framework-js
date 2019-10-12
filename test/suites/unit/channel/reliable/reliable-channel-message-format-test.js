import {ReliableMessageSerializer} from "../../../../../src/vnf/channel/reliable/reliable-message-serializer.js";

var messageSamples = [
    {
        description: "Handshake",
        messageJson: {
                         type: 'HANDSHAKE',
                         fromSid: 'from-sid'
                     },
        messageString: "HANDSHAKE from-sid"
    },

    {
        description: "Accept",
        messageJson: {
                         type: 'ACCEPT',
                         toSid:'to-sid',
                         fromSid: 'from-sid'
                     },
        messageString: "ACCEPT to-sid from-sid"
    },

    {
        description: "Heartbeat",
        messageJson: {
                         type: 'HEARTBEAT',
                         toSid:'to-sid',
                         fromSid: 'from-sid',
                         gapBegin: 3,
                         gapEnd: 8
                     },
        messageString: "HEARTBEAT to-sid from-sid 3 8"
    },

    {
        description: "Message",
        messageJson: {
                         type: 'MESSAGE',
                         toSid:'to-sid',
                         messageIndex: 12,
                         payload: "message value"
                     },
        messageString: "MESSAGE to-sid 12 message value",
    },

    {
        description: "Close Connection Message",
        messageJson: {
                         type:   'CLOSE-CONNECTION',
                         toSid:  'to-sid',
                         fromSid:'from-sid',
                     },
        messageString: "CLOSE-CONNECTION to-sid from-sid"
    },
]



QUnit.module("Reliable serializer test");
QUnit.test("[Reliable serializer test]: Serialize test", function(assert){
    for(var i = 0; i < messageSamples.length; i++) {
        var description = messageSamples[i].description;
        var messageJson = messageSamples[i].messageJson;
        var messageString = messageSamples[i].messageString;

        assert.equal(ReliableMessageSerializer.serialize(messageJson), messageString, "Verifying " + description);
    }
});

QUnit.test("[Reliable serializer test]: Deserialize test", function(assert){
    for(var i = 0; i < messageSamples.length; i++) {
        var description = messageSamples[i].description;
        var messageJson = messageSamples[i].messageJson;
        var messageString = messageSamples[i].messageString;

        assert.deepEqual(ReliableMessageSerializer.deserialize(messageString), messageJson, "Verifying " + description);
    }
});

QUnit.test("[Reliable serializer test]: Integrity check deserialize(serialize)", function(assert){
    for(var i = 0; i < messageSamples.length; i++) {
        var description = messageSamples[i].description;
        var messageJson = messageSamples[i].messageJson;
        var messageString = messageSamples[i].messageString;


        assert.deepEqual(ReliableMessageSerializer.deserialize(ReliableMessageSerializer.serialize(messageJson)), messageJson, "Verifying " + description);
    }
});

QUnit.test("[Reliable serializer test]: Integrity check serialize(deserialize)", function(assert){
    for(var i = 0; i < messageSamples.length; i++) {
        var description = messageSamples[i].description;
        var messageJson = messageSamples[i].messageJson;
        var messageString = messageSamples[i].messageString;


        assert.deepEqual(ReliableMessageSerializer.serialize(ReliableMessageSerializer.deserialize(messageString)), messageString, "Verifying " + description);
    }
});
