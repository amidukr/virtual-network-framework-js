import {ReliableTestUtils} from "../../../../utils/reliable-test-utils.js";

QUnit.module("ReliableHub Connection Lost");
ReliableTestUtils.reliableVnfTest("Connection Lost: Close connection by reliable endpoint", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(100);
    argument.reliableHub.setConnectionInvalidateInterval(500);
    argument.reliableHub.setConnectionLostTimeout(500);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))

    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1']))
    .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

    // will eventually occur after some timeout
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

    .then(argument.destroy)
    .then(done);
});


ReliableTestUtils.reliableVnfTest("Connection Lost: Close connection by root endpoint", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(100);
    argument.reliableHub.setConnectionInvalidateInterval(500);
    argument.reliableHub.setConnectionLostTimeout(500);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))
    .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

    // will eventually occur after some timeout
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

    .then(argument.destroy)
    .then(done);
});

ReliableTestUtils.reliableVnfTest("Connection Lost: openConnection just after closeConnection", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(100);
    argument.reliableHub.setConnectionInvalidateInterval(500);
    argument.reliableHub.setConnectionLostTimeout(500);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(function(){
        argument.reliableEndpoint.closeConnection("root-endpoint");
        argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            argument.reliableCapture.signal("openConnection captured")
        })
    })

    .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-2']))

    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-2 root1-2"))

    .then(argument.reliableCapture.assertSignals.bind(null, ["openConnection captured"]))

    .then(argument.destroy)
    .then(done);
});



ReliableTestUtils.reliableVnfTest("Connection Lost: HANDSHAKE just after CLOSE-CONNECTION", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(100);
    argument.reliableHub.setConnectionInvalidateInterval(500);
    argument.reliableHub.setConnectionLostTimeout(500);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(function(){
        argument.rootEndpoint.send("reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1");
        argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-2");
    })

    .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: ACCEPT root1-2 rel1-2']))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-2 root1-2 0 -1"))

    .then(function(){
      argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            argument.destroy();
            done();
        });
    });
});



ReliableTestUtils.reliableVnfTest("Connection Lost: Close connection by reliable endpoint - verifying that parent connection can be reused", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(200);
    argument.reliableHub.setConnectionInvalidateInterval(400);
    argument.reliableHub.setConnectionLostTimeout(600);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1']))
    .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))



    .then(argument.reliableEndpoint.openConnection.bind(null, "root-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");
    }))

    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-2']))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-2 root1-2"))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-2 rel1-2 0 -1']))


    .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: CLOSE-CONNECTION root1-2 rel1-2']))
    .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

    // will eventually occur after some timeout
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

    .then(argument.destroy)
    .then(done);
});

ReliableTestUtils.reliableVnfTest("Connection Lost: ignore close connection without special message", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(200);
    argument.reliableHub.setConnectionInvalidateInterval(600);
    argument.reliableHub.setConnectionLostTimeout(600);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.rootEndpoint.closeConnection.bind(null, "reliable-endpoint"))
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))

    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1']))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

    .then(argument.reliableCapture.assertSilence.bind(null, 0))
    .then(argument.rootCapture.assertSilence.bind(null, 0))

    .then(argument.destroy)
    .then(done);
});

ReliableTestUtils.reliableVnfTest("Connection Lost: send message after connection lost message", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(100);
    argument.reliableHub.setConnectionInvalidateInterval(500);
    argument.reliableHub.setConnectionLostTimeout(500);

    argument.reliableEndpoint.onConnectionLost(function(event){
        argument.reliableEndpoint.openConnection("root-endpoint", function(event){})
    });

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))

    .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))

    .then(argument.destroy)
    .then(done);
});

ReliableTestUtils.reliableVnfTest("Connection Lost: Reply with CLOSE-CONNECTION to HANDSHAKE", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(200);
    argument.reliableHub.setConnectionInvalidateInterval(400);
    argument.reliableHub.setConnectionLostTimeout(600);

    argument.reliableEndpoint.openConnection("root-endpoint", function(event){
        assert.equal(event.status, "FAILED", "Verifying status");

        argument.reliableCapture.signal("openConnection captured");
    });

    Promise.resolve()
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-1"]))
    .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))

    //HANDSHAKE retry after some delay
    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-1"]))

    .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.reliableCapture.assertSignals.bind(null, ["openConnection captured"]))

    .then(argument.destroy)
    .then(done);
});
