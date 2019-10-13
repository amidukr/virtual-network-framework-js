import {ReliableTestUtils} from "../../../../utils/reliable-test-utils.js";

QUnit.module("ReliableHub Accept Retry");
ReliableTestUtils.reliableVnfTest("Accept Retries: (Reliable<--Root) Connect established with extras sid, after sequence of ignore Accept Retry ", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(5);
    argument.reliableHub.setConnectionInvalidateInterval(10);
    argument.reliableHub.setConnectionLostTimeout(20);

    argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verif1ying status");
        argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
    })

    Promise.resolve()
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

    .then(function(){
        argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-2");
        })
    })

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-2 rel1-2"]))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-2 root1-2 0 -1"))

    .then(function(){
        argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            argument.destroy();
            done();
        });
    });
});

ReliableTestUtils.reliableVnfTest("Accept Retries: (Reliable<--Root) Accept retry failed no fallback to handshake", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(5);
    argument.reliableHub.setConnectionInvalidateInterval(10);
    argument.reliableHub.setConnectionLostTimeout(20);

    argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");
        argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
    })

    Promise.resolve()
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

    .then(function(){
        assert.ok(argument.reliableEndpoint.getConnection("root-endpoint") != null, "Reliable connection connecting")
    })

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

    .then(function(){
        assert.ok(argument.reliableEndpoint.getConnection("root-endpoint") == null, "Reliable connection is not connecting")
    })

    .then(argument.rootCapture.assertSilence.bind(null, 60))
    .then(argument.reliableCapture.assertSilence.bind(null, 0))

    .then(argument.destroy)
    .then(done);
});


ReliableTestUtils.reliableVnfTest("Accept Retries: (Reliable<--Root) Accept retry openConnection succeed, with extra handshake attempt", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(50);
    argument.reliableHub.setConnectionInvalidateInterval(100);
    argument.reliableHub.setConnectionLostTimeout(200);

    argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");
        argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
    })

    Promise.resolve()
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

    .then(function(){
        argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            argument.reliableCapture.signal("openConnection captured");
        });
    })

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

    // After accept failed test, reliable endpoint tries to complete open connection with extra handshake sequence
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-2 root1-2"))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HEARTBEAT root1-2 rel1-2 0 -1"]))

    .then(argument.reliableCapture.assertSignals.bind(null, ["openConnection captured"]))

    .then(argument.destroy)
    .then(done);

});

ReliableTestUtils.reliableVnfTest("Accept Retries: (Reliable<--Root) Accept retry - openConnection fail", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(50);
    argument.reliableHub.setConnectionInvalidateInterval(100);
    argument.reliableHub.setConnectionLostTimeout(200);

    argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");
        argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
    })

    Promise.resolve()
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

    .then(function(){
        argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            assert.equal(event.status, "FAILED", "Verifying status");

            argument.reliableCapture.signal("openConnection captured");
        });
    })

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

    // After accept failed test, reliable endpoint tries to complete open connection with extra handshake sequence
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

    .then(argument.reliableCapture.assertSignals.bind(null, ["openConnection captured"]))

    .then(argument.destroy)
    .then(done);
});
