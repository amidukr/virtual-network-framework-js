requirejs(["test/vnf/channel/reliable/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Message Order Correction");
    ReliableTestUtils.reliableVNFTest("Order Correction: Test send first message after mqStartFrom", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()


        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":3,"payload":"message-4"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":1,"payload":"message-phantom"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":2,"payload":"message-3"}))

        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-4']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVNFTest("Order Correction: Test send first message before mqStartFrom", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()


        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":1,"payload":"message-phantom"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":2,"payload":"message-3"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":3,"payload":"message-4"}))


        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-4']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVNFTest("Order Correction: mqStartFrom Test send shuffled messages", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()


        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":1,"payload":"message-phantom"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":3,"payload":"message-4"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":2,"payload":"message-3"}))


        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-4']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVNFTest("Order Correction: Double message send", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()


        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":2,"payload":"message-3"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":3,"payload":"message-4"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":3,"payload":"message-4"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":4,"payload":"message-5"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":5,"payload":"message-6"}))


        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-4']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-5']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-6']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVNFTest("Order Correction: Shuffled messages", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()


        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":4,"messageIndex":4,"payload":"message-3"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":4,"messageIndex":8,"payload":"message-7"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":4,"messageIndex":7,"payload":"message-6"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":4,"messageIndex":5,"payload":"message-4"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":4,"messageIndex":6,"payload":"message-5"}))


        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-4']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-5']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-6']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-7']))

        .then(argument.destroy)
        .then(done);
    });
})