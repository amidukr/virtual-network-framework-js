import {ReliableTestUtils} from "../../../../utils/reliable-test-utils.js";

QUnit.module("ReliableHub Phantom Messages Retry");
ReliableTestUtils.reliableVnfTest("Phantom Detection: No-Action state", function(assert, argument) {
     var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(100);
    argument.reliableHub.setConnectionInvalidateInterval(1000);
    argument.reliableHub.setConnectionLostTimeout(1000);

    Promise.resolve()

    .then(function(){
        return new Promise(function(r){
            argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying connection status");

                r();
            });
        });
    })

    // Phantom: wrong message type
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root1-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "MESSAGE rel1-1 0 message-phantom-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root1-1 rel1-1"]))

    .then(argument.rootCapture.assertSilence.bind(null, 60))
    .then(argument.reliableCapture.assertSilence.bind(null, 0))

    .then(function(){
        assert.ok(!argument.reliableEndpoint.isConnected("root-endpoint"), "Verifying not connected")
    })


    // Go next
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HANDSHAKE root1-2"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-2 rel1-1"]))

    .then(argument.destroy)
    .then(done);
});


ReliableTestUtils.reliableVnfTest("Phantom Detection: Handshaking state", function(assert, argument) {
     var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(100);
    argument.reliableHub.setConnectionInvalidateInterval(1000);
    argument.reliableHub.setConnectionLostTimeout(1000);

    argument.reliableEndpoint.openConnection("root-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        argument.reliableCapture.signal("openConnection captured");
    });

    Promise.resolve()

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-1"]))

    // Phantom: wrong message type
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "MESSAGE rel1-1 0 message-phantom-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root1-1 rel1-1"]))

    // Phantom: wrong session identifies
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel2-1 root1-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT  root3-1")) // empty toSid


    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-1"]))
    .then(argument.reliableCapture.assertSilence.bind(null, 0))

    .then(function(){
        assert.ok(!argument.reliableEndpoint.isConnected("root-endpoint"), "Verifying not connected")
    })

    // Go next
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root1-1"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1"]))

    .then(argument.reliableCapture.assertSignals.bind(null, ["openConnection captured"]))

    .then(argument.destroy)
    .then(done);
});

ReliableTestUtils.reliableVnfTest("Phantom Detection: Accepting state", function(assert, argument) {
     var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(100);
    argument.reliableHub.setConnectionInvalidateInterval(1000);
    argument.reliableHub.setConnectionLostTimeout(1000);

    argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
    })

    Promise.resolve()
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

    // Phantom: wrong message types
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "MESSAGE rel1-1 0 message-phantom-1"))


    // Phantom: wrong session identifies
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HANDSHAKE root2-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root2-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel2-1 root1-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT  root2-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root2-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel2-1 root1-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT  root1-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root2-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel2-1 root1-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION  root1-1"))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root2-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root1-1 rel2-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root1-1 "]))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.reliableCapture.assertSilence.bind(null, 0))

    .then(function(){
        assert.ok(!argument.reliableEndpoint.isConnected("root-endpoint"), "Verifying not connected")
    })

    // Go next
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1"]))

    .then(function(){
        assert.ok(argument.reliableEndpoint.isConnected("root-endpoint"), "Verifying reliable connected")
    })

    .then(argument.destroy)
    .then(done);
});



ReliableTestUtils.reliableVnfTest("Phantom Detection: Connected state", function(assert, argument) {
     var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(100);
    argument.reliableHub.setConnectionInvalidateInterval(1000);
    argument.reliableHub.setConnectionLostTimeout(1000);

    argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
    })

    Promise.resolve()
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1"]))

    .then(argument.reliableEndpoint.send.bind(null, "root-endpoint", "message-1"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: MESSAGE root1-1 0 message-1"]))

    // Phantom: wrong message types
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HANDSHAKE root2-1"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1"]))

    // Phantom: wrong session identifies
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root2-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel2-1 root1-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT  root1-1"))
    // message from send buff is sent only for second heartbeat with same gapBegin index
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root2-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root2-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel2-1 root1-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel2-1 root1-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT  root1-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT  root1-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "MESSAGE rel2-1 0 message-phantom-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "MESSAGE  0 message-phantom-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root2-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel2-1 root1-1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION  root1-1"))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root2-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root1-1 rel2-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root1-1 "]))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1"]))
    .then(argument.reliableCapture.assertSilence.bind(null, 0))

    // Go next
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: MESSAGE root1-1 0 message-1"]))

    .then(argument.destroy)
    .then(done);
});
