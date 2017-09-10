requirejs([ "vnf/vnf",
            "utils/signal-captor",
            "utils/logger",
            "test/utils/vnf-test-utils",
            "test/utils/channel-test-utils"],
function(  Vnf,
           SignalCaptor,
           Log,
           VnfTestUtils,
           ChannelTestUtils){

    //Basic Tests
    // end point API verfication
    // openConnection - test event
    // openConnection - send - test event
    // openConnection - send/reply - test event
    // send without connection - catch exception

    //Extra Tests
    // sendObject
    // loopback test
    // send Big message

    //Connection Close Tests
    // openConnection - closeConnection -- assert event
    // openConnection - destroy - -- assert event
    // openConnection - closeConnection - send - catch exception

    //Open Connection Tests
    // --- all test should verify that was not connection close ---
    // openConnection in openConnection
    // openConneciotn in onMessage
    // each openConnection overwrite previous.

    //Concurrent Connections Tests
    //  extract from vnf-channel-test.js

    //Open connection after close
    //  extract from vnf-channel-test.js
    // open-close-open
    // open-destroy-open



    QUnit.module("Channel Basic Tests");
    ChannelTestUtils.integrationTest("Channel API Verification", function(assert, args) {
        assert.ok(args.endpointRecipient.send, "Verifying send method");
        assert.ok(args.endpointRecipient.openConnection,    "Verifying openConnection method");
        assert.ok(args.endpointRecipient.isConnected,      "Verifying isConnected method");
        assert.ok(args.endpointRecipient.closeConnection,  "Verifying closeConnection method");
        assert.ok(args.endpointRecipient.onConnectionLost, "Verifying onConnectionLost method");
        assert.ok(args.endpointRecipient.destroy, "Verifying destroy method");
        assert.equal(args.endpointRecipient.vip, "recipient", "Verifying vip property");

        args.endpointRecipient.destroy();
        args.endpointSender.destroy()
    });

    ChannelTestUtils.integrationTest("Open Connection Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointSender.openConnection("recipient", function(event){
            Log.info(event.endpoint.vip, "connection opened", JSON.stringify(event));

            assert.equal(event.status,    "CONNECTED", "Verifying status");
            assert.equal(event.targetVip, "recipient", "Verifying targetVip");
            assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
            assert.equal(event.endpoint.vip, "sender", "Verifying endpoint vip");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        });
    });

    ChannelTestUtils.integrationTest("Open Connection Failed Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointSender.openConnection("non-existent-recipient", function(event){
            Log.info(event.endpoint.vip, "connection opened", JSON.stringify(event));

            assert.equal(event.status,   "FAILED", "Verifying status");
            assert.equal(event.targetVip, "non-existent-recipient", "Verifying targetVip");
            assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
            assert.equal(event.endpoint.vip, "sender", "Verifying endpoint vip");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        });
    });

    ChannelTestUtils.integrationTest("Channel Send Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointRecipient.onMessage = function(event) {
            Log.info(event.endpoint.vip, "message-test-handler", JSON.stringify(event));

            assert.equal(event.message,   "sent to recipient message", "Verifying message");
            assert.equal(event.sourceVip, "sender", "Verifying sourceVip");
            assert.equal(event.endpoint, args.endpointRecipient, "Verifying endpoint");
            assert.equal(event.endpoint.vip, "recipient", "Verifying endpoint vip");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        };

        args.endpointSender.openConnection("recipient", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            args.endpointSender.send("recipient", "sent to recipient message");
        });
    });


    ChannelTestUtils.integrationTest("Channel Send-Reply Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointRecipient.onMessage = function(event) {
            Log.info(event.endpoint.vip, "message-test-handler", JSON.stringify(event));

            args.endpointRecipient.send("sender", "pong to: " + event.message);
        };

        args.endpointSender.onMessage = function(event) {

            assert.equal(event.message,   "pong to: sent to recipient message", "Verifying message");
            assert.equal(event.sourceVip, "recipient", "Verifying sourceVip");
            assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
            assert.equal(event.endpoint.vip, "sender", "Verifying endpoint vip");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        };

        args.endpointSender.openConnection("recipient", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            args.endpointSender.send("recipient", "sent to recipient message");
        });
    });


    ChannelTestUtils.integrationTest("Channel No-Connection exception test", function(assert, args) {
        var done = assert.async(1);

        assert.throws(
            function() {
                args.endpointSender.send("recipient", "sent to recipient message");
            },  "Connection to endpoint 'recipient' isn't established");

        args.endpointRecipient.destroy();
        args.endpointSender.destroy();

        done();
    });
})
