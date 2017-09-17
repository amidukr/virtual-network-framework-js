requirejs(["test/utils/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Connection Lost");
    ReliableTestUtils.reliableVnfTest("Connection Lost: Close connection by reliable endpoint", function(assert, argument) {
        var done = assert.async(1);

        argument.fastHeartbeats();

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

    ReliableTestUtils.reliableVnfTest("Connection Lost: Close connection by reliable endpoint - verifying that parent connection can be reused", function(assert, argument) {
        var done = assert.async(1);

        argument.fastHeartbeats();

        Promise.resolve()

        .then(argument.makeConnection)

        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1']))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))



        .then(argument.reliableEndpoint.openConnection.bind(null, "root-endpont", function(){
            assert.equal(event.status, "CONNECTED", "Verifying status");
        }))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-2']))
        .then(argument.rootCapture.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root1-2"))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-2 rel1-2 0 -1']))


        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: CLOSE-CONNECTION root1-2 rel1-2']))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

        // will eventually occur after some timeout
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Connection Lost: Close connection by root endpoint", function(assert, argument) {
        var done = assert.async(1);

        argument.fastHeartbeats();

        Promise.resolve()

        .then(argument.makeConnection)

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))

        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

        // will eventually occur after some timeout
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Connection Lost: ignore close connection without special message", function(assert, argument) {
        var done = assert.async(1);

        argument.fastHeartbeats();

        Promise.resolve()

        .then(argument.makeConnection)

        .then(argument.rootEndpoint.closeConnection.bind(null, "reliable-endpoint"))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.rootCapture.assertSignals.bind(null, ['HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['HEARTBEAT root1-1 rel1-1 0 -1']))

        .then(argument.reliableCapture.assertSilence.bind(null, 0))
        .then(argument.rootCapture.assertSilence.bind(null, 0))


        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Connection Lost: send message after closeConnection call", function(assert, argument) {
        var done = assert.async(1);

        Promise.resolve()

        .then(argument.makeConnection)

        .then(function(){
            argument.reliableEndpoint.closeConnection("root-endpoint");
            //TODO: exception is going to be here, implemented by framework no reason to retest, test should be removed, will see.
            argument.reliableEndpoint.send("root-endpoint", "message-3");
        })

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"CLOSE-CONNECTION","sessionId":"rel1-1","toSID":"root1-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint connection lost']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-2","messageIndex":1,"payload":"message-3"}']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Connection Lost: send message after connection lost message", function(assert, argument) {
        var done = assert.async(1);

        argument.fastHeartbeats();

        argument.reliableEndpoint.onConnectionLost(function(event){
            argument.reliableEndpoint.openConnection("root-endpoint", function(event){})
        });

        Promise.resolve()

        .then(argument.makeConnection)

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))

        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["HANDSHAKE rel1-2"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Connection Lost: Reply with CLOSE-CONNECTION to HANDSHAKE", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            argument.destroy();
            done();
        });

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ["HANDSHAKE rel1-1"]))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))

        //HANDSHAKE retry after some delay
        .then(argument.rootCapture.assertSignals.bind(null, ["HANDSHAKE rel1-1"]))

        .then(argument.reliableEndpoint.closeConnection("root-endpoint"))

        .then(argument.rootEndpoint.assertSignals.bind(null, ["from root-endpoint connection lost"]));
    });



})