requirejs(["test/utils/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Heartbeats");
    ReliableTestUtils.reliableVnfTest("Connection Lost: by timeout", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(argument.toAbsoluteInterval(300));
        argument.reliableHub.setConnectionInvalidateInterval(argument.toAbsoluteInterval(900));
        argument.reliableHub.setConnectionLostTimeout(argument.toAbsoluteInterval(1499));
        argument.reliableHub.setKeepAliveHandshakingChannelTimeout(argument.toAbsoluteInterval(600));

        Promise.resolve()

        .then(argument.makeConnection)

        //300ms - heartbeat 1
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))

        //600ms - heartbeat 2
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))

        //900ms - invalidate
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))


        //1200ms - heartbeat 3
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.reliableCapture.assertSilence.bind(null, 0))

        //1500ms - connection lost
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1']))
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
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))

        // invalidate 2 - 10 heartbeats
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))

        // invalidate 3 - 9 heartbeats + connection lost
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1']))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))

        // root capture lost after timeout
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });
});