requirejs(["test/vnf/channel/reliable/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Handshake Retry");
    ReliableTestUtils.reliableVNFTest("ReliableHub Handshake Retry test", function(assert, argument) {
        var done = assert.async(1);

        argument.fastHeartbeats();
        argument.reliableHub.setHandshakeRetries(3);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"message-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSilence.bind(null, 60))



        .then(argument.destroy)
        .then(done);
    });
})