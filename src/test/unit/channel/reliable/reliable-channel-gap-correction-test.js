requirejs(["test/utils/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Message Gap Correction");
    ReliableTestUtils.reliableVnfTest("Gap Correction: Gap Detection", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        Promise.resolve()

        .then(argument.makeConnection)

        .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 0 message-2"))
        .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 5 message-2"))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 1 4']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Gap Correction: gap response in middle", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        Promise.resolve()

        .then(argument.makeConnection)

        .then(function(){
            argument.reliableEndpoint.send('root-endpoint', "message-1");
            argument.reliableEndpoint.send('root-endpoint', "message-2");
            argument.reliableEndpoint.send('root-endpoint', "message-3");
            argument.reliableEndpoint.send('root-endpoint', "message-4");
            argument.reliableEndpoint.send('root-endpoint', "message-5");
        })

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 0 message-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 1 message-2']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 2 message-3']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 3 message-4']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 4 message-5']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 2 3"))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 2 3"))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 2 message-3']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 3 message-4']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Gap Correction: gap response in end", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        Promise.resolve()

        .then(argument.makeConnection)

        .then(function(){
            argument.reliableEndpoint.send('root-endpoint', "message-1");
            argument.reliableEndpoint.send('root-endpoint', "message-2");
            argument.reliableEndpoint.send('root-endpoint', "message-3");
            argument.reliableEndpoint.send('root-endpoint', "message-4");
            argument.reliableEndpoint.send('root-endpoint', "message-5");
        })

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 0 message-1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 1 message-2']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 2 message-3']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 3 message-4']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 4 message-5']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 3 -1"))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 3 -1"))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 3 message-4']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 4 message-5']))

        .then(argument.destroy)
        .then(done);
    });
})