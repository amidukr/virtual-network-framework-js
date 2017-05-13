requirejs(["test/utils/reliable-test-utils",
           "test/utils/vnf-test-utils"],
function( ReliableTestUtils,
          VNFTestUtils){

    QUnit.module("ReliableHub Handshake with heartbeats");
    ReliableTestUtils.reliableVNFTest("Heartbeats Handshakes: (Reliable<--Root) Catch accept heartbeat", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":2,"payload":"message-1"});
        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":3,"payload":"message-2"});

        Promise.resolve()

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":0,"gapBegin":4,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":0,"gapBegin":4,"gapEnd":-1}']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"REGULAR","toSID":"rel1-1","messageIndex":4,"payload":"message-3"}))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":5,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":5,"gapEnd":-1}']))

        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-1']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-2']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVNFTest("Heartbeats Handshakes: (Reliable<--Root) Test handshake accept sequence for reliable endpoint with heartbeats", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":2,"payload":"message-1"});
        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":3,"payload":"message-2"});

        Promise.resolve()

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":0,"gapBegin":4,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":0,"gapBegin":4,"gapEnd":-1}']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"HEARTBEAT-REGULAR","toSID":"rel1-1","gapBegin":0,"gapEnd":-1}))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":4,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":4,"gapEnd":-1}']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVNFTest("Heartbeats Handshakes: (Reliable-->Root) Test handshake initiation sequence by reliable endpoint with heartbeats", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"HEARTBEAT-ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":7,"gapBegin":2,"gapEnd":-1}))

        .then(VNFTestUtils.onHeartbeatPromise.bind(null, argument.reliableEndpoint))

        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-3"))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"message-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":2,"payload":"message-3"}']))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":7,"gapEnd":-1}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HEARTBEAT-REGULAR","toSID":"root1-1","gapBegin":7,"gapEnd":-1}']))

        .then(argument.destroy)
        .then(done);
    });
});