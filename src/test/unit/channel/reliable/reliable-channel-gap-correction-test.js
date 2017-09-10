requirejs(["test/utils/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Message Gap Correction");
    ReliableTestUtils.reliableVnfTest("Gap Correction: Gap Detection", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":1,"payload":"message-2"});
        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":5,"payload":"message-2"});

        Promise.resolve()

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":0,"gapBegin":2,"gapEnd":4}']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Gap Correction: gap response in middle", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");
        argument.reliableEndpoint.send('root-endpoint', "message-3");
        argument.reliableEndpoint.send('root-endpoint', "message-4");
        argument.reliableEndpoint.send('root-endpoint', "message-5");

        Promise.resolve()

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"message-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":2,"payload":"message-3"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":3,"payload":"message-4"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":4,"payload":"message-5"}']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"HEARTBEAT-ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":0,"gapBegin":2,"gapEnd":3}))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":2,"payload":"message-3"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":3,"payload":"message-4"}']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Gap Correction: gap response in end", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");
        argument.reliableEndpoint.send('root-endpoint', "message-3");
        argument.reliableEndpoint.send('root-endpoint', "message-4");
        argument.reliableEndpoint.send('root-endpoint', "message-5");

        Promise.resolve()

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"message-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":2,"payload":"message-3"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":3,"payload":"message-4"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":4,"payload":"message-5"}']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"HEARTBEAT-ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":0,"gapBegin":3,"gapEnd":-1}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"HEARTBEAT-ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":0,"gapBegin":3,"gapEnd":-1}))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":3,"payload":"message-4"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":4,"payload":"message-5"}']))

        .then(argument.destroy)
        .then(done);
    });
})