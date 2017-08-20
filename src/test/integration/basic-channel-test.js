requirejs(["vnf/vnf",
           "utils/signal-captor",
           "utils/logger",
           "test/utils/vnf-test-utils"],
function(  Vnf,
           SignalCaptor,
           Log,
           VnfTestUtils){
    //TODO: extract big message test
    //TODO: extract connection close check signal test
    //TODO: extract destroy method test
    //TODO: extract send after close connection test
    //TODO: extract send after destroy test

    function genericChannelTest(description, callback) {

        function inBrowserFactory(){
            return new Vnf.InBrowserHub();
        }

        function reliableRtcWebSocketFactory(){
            return new Vnf.ReliableRtcHub(webSocketFactory());
        }

        function rtcFactory(){
            return new Vnf.RtcHub(new Vnf.InBrowserHub());
        }

        function reliableWebSocketFactory() {
            return new Vnf.ReliableHub(webSocketFactory());
        }

        function webSocketFactory() {
            return new Vnf.WebSocketHub(new Vnf.WebSocketFactory(TestingProfiles.getValue(null, "vnfWebSocketUrl")));
        }

        function reliableFactory() {
            return new Vnf.ReliableHub(new Vnf.InBrowserHub());
        }

        function reliableRtcFactory() {
            return new Vnf.ReliableRtcHub(new Vnf.InBrowserHub());
        }


        function channelTest(channelName, channelHubFactory, description, callback) {
            VnfTestUtils.test(["Channel Basic Tests", channelName], description,    {hubFactory: channelHubFactory}, function(assert, args){
                args.vnfHub = args.hubFactory();
                args.endpointRecipient = args.vnfHub.openEndpoint("recipient");


                args.recipientCaptor = new SignalCaptor(assert);
                args.senderCaptor    = new SignalCaptor(assert);

                function invokeCallback() {
                    args.endpointSender = args.vnfHub.openEndpoint("sender");

                    args.endpointRecipient.onMessage = VnfTestUtils.newPrintCallback(args.recipientCaptor, "recipient");
                    args.endpointSender.onMessage    = VnfTestUtils.newPrintCallback(args.senderCaptor, "sender");

                    callback(assert, args);
                }

                if(["WebSocket", "Reliable Rtc WebSocket"].indexOf(channelName) != -1) {
                    var done = assert.async(1);
                    args.endpointRecipient.send("recipient", "init-message");

                    args.endpointRecipient.onMessage = function(){
                        invokeCallback();
                        done();
                    }
                }else{
                    invokeCallback();
                }
            });
        }

        // Main cases
        channelTest("InBrowser",              inBrowserFactory,            description, callback);
        channelTest("Reliable Rtc WebSocket", reliableRtcWebSocketFactory, description, callback);


        // Misc
        channelTest("Rtc",       rtcFactory,       description, callback);
        channelTest("WebSocket", webSocketFactory, description, callback);
        channelTest("Reliable",  reliableFactory,  description, callback);

        // ReliableRtc
        channelTest("Reliable Rtc", reliableRtcFactory, description, callback);
    }

    QUnit.module("Channel Basic Tests");
    genericChannelTest("Channel API Verification", function(assert, args) {
         assert.ok(args.endpointRecipient.send, "Verifying send method");
         assert.ok(args.endpointRecipient.isConnected,      "Verifying isConnected method");
         assert.ok(args.endpointRecipient.closeConnection,  "Verifying closeConnection method");
         assert.ok(args.endpointRecipient.onConnectionLost, "Verifying onConnectionLost method");
         assert.ok(args.endpointRecipient.destroy, "Verifying destroy method");
         assert.equal(args.endpointRecipient.vip, "recipient", "Verifying vip property");

         args.endpointRecipient.destroy();
    });

    genericChannelTest("Channel Send Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointRecipient.onMessage = function(event) {
            Log.info(event.endpoint.vip, "message-test-handler", JSON.stringify(event));

            assert.equal(event.message,   "sender to recipient message");
            assert.equal(event.sourceVip, "sender");
            assert.equal(event.endpoint, args.endpointRecipient);
            assert.equal(event.endpoint.vip, "recipient");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        };

        args.endpointSender.send("recipient", "sender to recipient message");
    });


    genericChannelTest("Channel Send Object Test", function(assert, args) {
         var done = assert.async(1);

        args.endpointRecipient.onMessage = function(event) {
            Log.info(event.endpoint.vip, "message-test-handler", JSON.stringify(event));

            assert.equal(event.message.value1,       "object-value-1");
            assert.equal(event.message.sub.value2,   "object-sub-value-2");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        };

        args.endpointSender.send("recipient", {value1: "object-value-1", sub:{value2: "object-sub-value-2"}});
    });

    genericChannelTest("Channel Send Message Reply Test", function(assert, args) {

        var done = assert.async(1);

        args.endpointSender.send("recipient", "message-1-message-to-recipient");

        Promise.resolve()
        .then(args.recipientCaptor.assertSignals.bind(null, ["from sender: message-1-message-to-recipient"]))
        .then(args.endpointRecipient.send.bind(null, "sender","message-2-message-to-sender"))
        .then(args.senderCaptor.assertSignals.bind(null, ["from recipient: message-2-message-to-sender"]))

         .then(args.endpointRecipient.destroy)
         .then(args.endpointSender.destroy)

         .then(done);
    });

    genericChannelTest("Channel Callback Test", function(assert, args) {

         var done = assert.async(1);

         args.endpointRecipient.onMessage = function(event) {
            var message = "from " + event.sourceVip + ": " + event.message;
            args.recipientCaptor.signal(message)

            event.endpoint.send(event.sourceVip, "pong from " + event.endpoint.vip + "[" + event.message + "]");
         }

         args.endpointSender.send("recipient", "message-from-sender");

         Promise.resolve()
         .then(args.recipientCaptor.assertSignals.bind(null, ["from sender: message-from-sender"]))
         .then(args.senderCaptor.assertSignals.bind(null, ["from recipient: pong from recipient[message-from-sender]"]))
         .then(args.endpointRecipient.destroy)
         .then(args.endpointSender.destroy)
         .then(done);
     });


    genericChannelTest("Channel Message by Message Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointSender = args.vnfHub.openEndpoint("sender");

        args.endpointSender.send("recipient", "message-sequence-1-from-sender-to-recipient");

        Promise.resolve()
        .then(args.recipientCaptor.assertSignals.bind(null, ["from sender: message-sequence-1-from-sender-to-recipient"]))
        .then(args.endpointSender.send.bind(null,             "recipient", "message-2-sequence-2-from-sender-to-recipient"))
        .then(args.recipientCaptor.assertSignals.bind(null, ["from sender: message-2-sequence-2-from-sender-to-recipient"]))

        .then(args.endpointRecipient.destroy)
        .then(args.endpointSender.destroy)

        .then(done);
    });


    genericChannelTest("Channel Double Message Send Test", function(assert, args) {

         var done = assert.async(1);

         args.endpointSender.send("recipient", "double-message-1-from-recipient-to-sender");
         args.endpointSender.send("recipient", "double-message-2-from-recipient-to-sender");

         args.recipientCaptor.assertSignals(["from sender: double-message-1-from-recipient-to-sender",
                                              "from sender: double-message-2-from-recipient-to-sender"])
        .then(args.endpointRecipient.destroy)
        .then(args.endpointSender.destroy)

        .then(done);
     });

    genericChannelTest("Three endpoints", function(assert, args) {

        var done = assert.async(1);

        var endpointThird = args.vnfHub.openEndpoint("third");
        var thirdCaptor = new SignalCaptor(assert);

        endpointThird.onMessage    = VnfTestUtils.newPrintCallback(thirdCaptor, "third");

        args.endpointSender.send("recipient", "message-1-message-to-recipient-from-sender");
        endpointThird.send("recipient",       "message-2-message-to-recipient-from-third");

        Promise.resolve()
        .then(args.recipientCaptor.assertSignalsUnordered.bind(null, ["from sender: message-1-message-to-recipient-from-sender",
                                                                      "from third: message-2-message-to-recipient-from-third"]))

        .then(args.endpointRecipient.send.bind(null, "sender", "message-3-to-sender"))
        .then(args.endpointRecipient.send.bind(null, "third",  "message-4-to-third"))

        .then(args.senderCaptor.assertSignals.bind(null, ["from recipient: message-3-to-sender"]))
        .then(thirdCaptor.assertSignals.bind(null,       ["from recipient: message-4-to-third"]))

        .then(args.endpointRecipient.destroy)
        .then(args.endpointSender.destroy)
        .then(endpointThird.destroy)
        .then(done);
    });

    genericChannelTest("Channel Loopback Test", function(assert, args) {

        var done = assert.async(1);

        args.endpointSender.send("sender", "message-sender-to-self");
        args.endpointRecipient.send("recipient", "message-recipient-to-self");

        Promise.resolve()
        .then(args.senderCaptor.assertSignals.bind(null, ["from sender: message-sender-to-self"]))
        .then(args.recipientCaptor.assertSignals.bind(null, ["from recipient: message-recipient-to-self"]))

        .then(args.endpointRecipient.destroy)
        .then(args.endpointSender.destroy)

        .then(done);
    });

    genericChannelTest("Call closeConnection, and send message", function(assert, args) {
        var done = assert.async(1);

        args.endpointSender.send("recipient", "message-1");

        Promise.resolve()
        .then(args.recipientCaptor.assertSignals.bind(null, ["from sender: message-1"]))
        .then(function(){
            args.endpointSender.closeConnection("recipient");
            args.endpointSender.send("recipient", "message-2");
        })

        .then(args.recipientCaptor.assertSignals.bind(null, ["from sender: message-2"]))

        .then(args.endpointRecipient.destroy)
        .then(args.endpointSender.destroy)

        .then(done);
    });
});