requirejs(["vnf/vnf",
           "utils/capture-logs",
           "test/vnf-test-utils"],
function(  VNF,
           Log,
           VNFTestUtils){


    function reliableVNFTest(description, callback) {
        function prepareArguments(assert, args) {
            var rootHub  = args.rootHubFactory();
            var reliableHub = new VNF.ReliableHub(rootHub);

            var reliableEndpoint = reliableHub.openEndpoint("reliable-endpoint");
            var rootEndpoint = rootHub.openEndpoint("root-endpoint");

            reliableEndpoint.onMessage = VNFTestUtils.newPrintCallback("reliable-endpoint");
            rootEndpoint.onMessage     = VNFTestUtils.newPrintCallback("root-endpoint");

            reliableEndpoint.setEndpointId("rel1");
            reliableEndpoint.setHeartbeatInterval(10000);

            var reliableCapture = Log.captureLogs(assert, ["reliable-endpoint"], ["message-test-handler"]);
            var rootCapture     = Log.captureLogs(assert, ["root-endpoint"],     ["message-test-handler"]);

            function destroy() {
                reliableEndpoint.destroy();
                rootEndpoint.destroy();
            }

            return {reliableHub:      reliableHub,
                    reliableEndpoint: reliableEndpoint,
                    reliableCapture:  reliableCapture,

                    rootHub:      rootHub,
                    rootEndpoint: rootEndpoint,
                    rootCapture:  rootCapture,

                    destroy: destroy};
        }

        VNFTestUtils.vnfTest("[Reliable Hub] Unit Test: " + description, prepareArguments, callback);
    };

    reliableVNFTest("(Reliable<--Root) Test handshake accept sequence for reliable endpoint", function(assert, argument) {
        var done = assert.async(1);

        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":2,"payload":"message-1"});
        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":3,"payload":"message-2"});

        Promise.resolve()
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-1']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-2']))

        .then(argument.reliableEndpoint.send.bind(null, "root-endpoint", "message-3"))
        .then(argument.reliableEndpoint.send.bind(null, "root-endpoint", "message-4"))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":0,"messageIndex":0,"payload":"message-3"}']))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":0,"messageIndex":1,"payload":"message-4"}']))


        .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', {"type": "REGULAR","toSID":"rel1-1","messageIndex":4,"payload":"message-5"}))
        .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', {"type": "REGULAR","toSID":"rel1-1","messageIndex":5,"payload":"message-6"}))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-5']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-6']))

        .then(argument.reliableEndpoint.send.bind(null, "root-endpoint", "message-7"))
        .then(argument.reliableEndpoint.send.bind(null, "root-endpoint", "message-8"))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":2,"payload":"message-7"}']))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":3,"payload":"message-8"}']))

        .then(argument.destroy)
        .then(done);
    });

    reliableVNFTest("(Reliable-->Root) Test handshake initiation sequence by reliable endpoint", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");

        Promise.resolve()
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"message-1"}']))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":2,"payload":"message-3"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":2,"messageIndex":3,"payload":"message-4"}))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-3']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-4']))

        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-5"))
        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-6"))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":2,"payload":"message-5"}']))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":3,"payload":"message-6"}']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"REGULAR","toSID":"rel1-1","messageIndex":4,"payload":"message-7"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"REGULAR","toSID":"rel1-1","messageIndex":5,"payload":"message-8"}))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-7']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-8']))

        .then(argument.destroy)
        .then(done);
    });

    reliableVNFTest("(Reliable<->Root) Test concurrent synchronous handshake-accept sequence initiation", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.send('root-endpoint', "message-1");
        argument.reliableEndpoint.send('root-endpoint', "message-2");
        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":2,"payload":"message-3"});
        argument.rootEndpoint.send('reliable-endpoint', {"type": "HANDSHAKE","sessionId":"root1-1","messageIndex":3,"payload":"message-4"});

        Promise.resolve()
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"message-1"}']))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":1,"payload":"message-2"}']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-3']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-4']))

        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-5"))
        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-6"))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":4,"messageIndex":4,"payload":"message-7"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":4,"messageIndex":5,"payload":"message-8"}))


        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":2,"messageIndex":2,"payload":"message-5"}']))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"ACCEPT","sessionId":"rel1-1","toSID":"root1-1","mqStartFrom":2,"messageIndex":3,"payload":"message-6"}']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-7']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-8']))

        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-9"))
        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message-10"))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"REGULAR","toSID":"rel1-1","messageIndex":6,"payload":"message-11"}))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"REGULAR","toSID":"rel1-1","messageIndex":7,"payload":"message-12"}))

        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":4,"payload":"message-9"}']))
        .then(argument.rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"REGULAR","toSID":"root1-1","messageIndex":5,"payload":"message-10"}']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-11']))
        .then(argument.reliableCapture.assertLog.bind(null, ['from root-endpoint: message-12']))

        .then(argument.destroy)
        .then(done);
    });

    reliableVNFTest("Test mqStartFrom", function(assert, argument) {
        // test by sending three accept message: with mqStartFrom,
        // mqStartFrom: 2, messageIndex: 3
        // mqStartFrom: 2, messageIndex: 1
        // mqStartFrom: 2, messageIndex: 2
        // assert that only messageIndex: 2 and messageIndex: 3 - retrieved in correct order
    });

    //TODO: close connection/reconnect cycles.
    //TODO: phantoms
    //TODO: gaps

    //TODO: integration test
    //TODO: stress tests
})