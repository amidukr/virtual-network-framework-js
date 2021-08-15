import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";
import {ChannelTestUtils} from "../../../../../test/utils/channel-test-utils.js";


QUnit.module("Channel Basic Tests", (hooks) => {

    ChannelTestUtils.integrationTest("Channel API Verification", function(assert, args) {
        assert.ok(args.endpointRecipient.send, "Verifying send method");
        assert.ok(args.endpointRecipient.openConnection,    "Verifying openConnection method");
        assert.ok(args.endpointRecipient.isConnected,      "Verifying isConnected method");
        assert.ok(args.endpointRecipient.closeConnection,  "Verifying closeConnection method");
        assert.ok(args.endpointRecipient.onConnectionLost, "Verifying onConnectionLost method");
        assert.ok(args.endpointRecipient.destroy, "Verifying destroy method");
        assert.equal(args.endpointRecipient.eva, args.recipientEva, "Verifying eva property");

        args.endpointRecipient.destroy();
        args.endpointSender.destroy()
    });

    ChannelTestUtils.integrationTest("Open Connection Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            Log.verbose(event.endpoint.eva, "connection opened", JSON.stringify(event));

            assert.equal(event.status,    "CONNECTED", "Verifying connection status");
            assert.equal(event.targetEva, args.recipientEva, "Verifying targetEva");
            assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
            assert.equal(event.endpoint.eva, args.senderEva, "Verifying endpoint eva");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        });
    });

    ChannelTestUtils.integrationTest("Open Connection Failed Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointSender.openConnection("non-existent-recipient", function(event){
            Log.verbose(event.endpoint.eva, "connection opened", JSON.stringify(event));

            assert.equal(event.status,   "FAILED", "Verifying connection status");
            assert.equal(event.targetEva, "non-existent-recipient", "Verifying targetEva");
            assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
            assert.equal(event.endpoint.eva, args.senderEva, "Verifying endpoint eva");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        });
    });

    ChannelTestUtils.integrationTest("Channel Send Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointRecipient.onMessage = function(event) {
            Log.verbose(event.endpoint.eva, "message-test-handler", JSON.stringify(event));

            assert.ok(args.endpointRecipient.isConnected(event.sourceEva), "Verifying connection established");

            assert.equal(event.message,   "sent to recipient message", "Verifying message");
            assert.equal(event.sourceEva, args.senderEva, "Verifying sourceEva");
            assert.equal(event.endpoint, args.endpointRecipient, "Verifying endpoint");
            assert.equal(event.endpoint.eva, args.recipientEva, "Verifying endpoint eva");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        };

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");
            if(event.status != "CONNECTED") return;
            args.endpointSender.send(args.recipientEva, "sent to recipient message");
        });
    });


    ChannelTestUtils.integrationTest("Channel Send-Reply Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointRecipient.onMessage = function(event) {
            Log.verbose(event.endpoint.eva, "message-test-handler", JSON.stringify(event));

            args.endpointRecipient.send(args.senderEva, "pong to: " + event.message);
        };

        args.endpointSender.onMessage = function(event) {

            assert.equal(event.message,   "pong to: sent to recipient message", "Verifying message");
            assert.equal(event.sourceEva, args.recipientEva, "Verifying sourceEva");
            assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
            assert.equal(event.endpoint.eva, args.senderEva, "Verifying endpoint eva");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        };

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");
            args.endpointSender.send(args.recipientEva, "sent to recipient message");
        });
    });


    ChannelTestUtils.integrationTest("Channel No-Connection exception test", function(assert, args) {
        var done = assert.async(1);

        assert.throws(
            function() {
                args.endpointSender.send(args.recipientEva, "sent to recipient message");
            },  "Connection to endpoint 'recipient' isn't established");

        args.endpointRecipient.destroy();
        args.endpointSender.destroy();

        done();
    });
});