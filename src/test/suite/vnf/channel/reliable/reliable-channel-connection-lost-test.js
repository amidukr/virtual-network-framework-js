requirejs(["test/utils/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Connection Lost");
    ReliableTestUtils.reliableVnfTest("Connection Lost: Close connection by reliable endpoint", function(assert, argument) {
        var done = assert.async(1);

        argument.fastHeartbeats();

        Promise.resolve()

        .then(argument.makeConnection)

        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"CLOSE-CONNECTION","sessionId":"rel1-1","toSID":"root1-1"}']))
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

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"CLOSE-CONNECTION","sessionId":"root1-1","toSID":"rel1-1"}))

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

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))

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
            argument.reliableEndpoint.send("root-endpoint", "message-3");
        });

        Promise.resolve()

        .then(argument.makeConnection)

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"CLOSE-CONNECTION","sessionId":"root1-1","toSID":"rel1-1"}))

        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-2","messageIndex":1,"payload":"message-3"}']))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Connection Lost: Reply with CLOSE-CONNECTION to HANDSHAKE", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"message-1"}']))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"CLOSE-CONNECTION","sessionId":"root1-1","toSID":"rel1-1"}))

        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });





    ReliableTestUtils.reliableVnfTest("Connection Lost: by timeout", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(argument.toAbsoluteInterval(300));
        argument.reliableHub.setConnectionInvalidateInterval(argument.toAbsoluteInterval(900));
        argument.reliableHub.setConnectionLostTimeout(argument.toAbsoluteInterval(1499));
        argument.reliableHub.setKeepAliveHandshakingChannelTimeout(argument.toAbsoluteInterval(600));

        Promise.resolve()

        .then(argument.makeConnection)

        //300ms - heartbeat 1
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))

        //600ms - heartbeat 2
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))

        //900ms - invalidate
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))


        //1200ms - heartbeat 3
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.reliableCapture.assertSilence.bind(null, 0))

        //1500ms - connection lost
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"CLOSE-CONNECTION","sessionId":"rel1-1","toSID":"root1-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });


    ReliableTestUtils.reliableVnfTest("Connection Lost: by timeout v2", function(assert, argument) {
        var done = assert.async(1);

        argument.fastHeartbeats();

        Promise.resolve()

        .then(argument.makeConnection)

        // invalidate 1 - 10 heartbeats
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))

        // invalidate 2 - 10 heartbeats
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))

        // invalidate 3 - 9 heartbeats + connection lost
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":1,"gapEnd":-1}']))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"CLOSE-CONNECTION","sessionId":"rel1-1","toSID":"root1-1"}']))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

        // root capture lost after timeout
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

})