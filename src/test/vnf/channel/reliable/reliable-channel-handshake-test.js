requirejs(["test/vnf/channel/reliable/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Handshake");
    ReliableTestUtils.reliableVNFTest("Handshakes: (Reliable<--Root) Test handshake accept sequence for reliable endpoint", function(assert, argument) {
        var done = assert.async(1);

        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":2,"payload":"message-1"});
        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":3,"payload":"message-2"});

        Promise.resolve()
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-1']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-2']))

        .then(argument.reliableEndpoint.send.bind(null, "root-endpoint", "message-3"))
        .then(argument.reliableEndpoint.send.bind(null, "root-endpoint", "message-4"))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":0,"messageIndex":0,"payload":"message-3"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":0,"messageIndex":1,"payload":"message-4"}']))


        .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', {"type": "REGULAR","toSID":"rel1-1","messageIndex":4,"payload":"message-5"}))
        .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', {"type": "REGULAR","toSID":"rel1-1","messageIndex":5,"payload":"message-6"}))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-5']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-6']))

        .then(argument.reliableEndpoint.send.bind(null, "root-endpoint", "message-7"))
        .then(argument.reliableEndpoint.send.bind(null, "root-endpoint", "message-8"))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":2,"payload":"message-7"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":3,"payload":"message-8"}']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVNFTest("Handshakes: (Reliable-->Root) Test handshake initiation sequence by reliable endpoint", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"message-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":2,"payload":"message-3"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":3,"payload":"message-4"}))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-4']))

        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-5"))
        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-6"))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":2,"payload":"message-5"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":3,"payload":"message-6"}']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"REGULAR","toSID":"rel1-1","messageIndex":4,"payload":"message-7"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"REGULAR","toSID":"rel1-1","messageIndex":5,"payload":"message-8"}))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-7']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-8']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVNFTest("Handshakes: (Reliable<->Root) Test concurrent synchronous handshake-accept sequence initiation", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");
        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":2,"payload":"message-3"});
        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":3,"payload":"message-4"});

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"message-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-4']))

        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-5"))
        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-6"))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":4,"messageIndex":4,"payload":"message-7"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":4,"messageIndex":5,"payload":"message-8"}))


        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":2,"messageIndex":2,"payload":"message-5"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":2,"messageIndex":3,"payload":"message-6"}']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-7']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-8']))

        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-9"))
        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-10"))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"REGULAR","toSID":"rel1-1","messageIndex":6,"payload":"message-11"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"REGULAR","toSID":"rel1-1","messageIndex":7,"payload":"message-12"}))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":4,"payload":"message-9"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":5,"payload":"message-10"}']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-11']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-12']))

        .then(argument.destroy)
        .then(done);
    });

    //TODO: reliable-channel-connection-lost-test.js: TODO: connection lost by destroy method
    //TODO; rename invalidate to closeConnection
    //TODO; add connecion lost to generic API, update vnf-channel-test with appropriate tests

    //TODO: test handshakes with unexpected message index(second acceptor case), ignore handshake FML gaps

    //TODO: phantoms
    //TODO: out buffs test/test handling for cleaned-up handshake messages

    //TODO: integration test
    //TODO: close connection/reconnect cycles.
    //TODO: connection lost should be consistent on both sides
    //TODO: stress tests
})