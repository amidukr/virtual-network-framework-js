requirejs(["test/utils/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Handshake Retry");
    ReliableTestUtils.reliableVnfTest("ReliableHub Handshake Retry test", function(assert, argument) {
        var done = assert.async(1);

        argument.fastHeartbeats();
        argument.reliableHub.setHandshakeRetries(3);

        argument.reliableEndpoint.openConnection('root-endpoint', function(event){
            assert.equal(event.status, "FAILED", "Verifying status");
            argument.destroy();
            done();
        })

        Promise.resolve()

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))


        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))


        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSilence.bind(null, 60))
        .then(argument.reliableCapture.assertSilence.bind(null, 0))
    });
})