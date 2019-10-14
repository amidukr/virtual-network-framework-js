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
        assert.equal(args.endpointRecipient.vip, args.recipientVip, "Verifying vip property");

        args.endpointRecipient.destroy();
        args.endpointSender.destroy()
    });

    ChannelTestUtils.integrationTest("Open Connection Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            Log.info(event.endpoint.vip, "connection opened", JSON.stringify(event));

            assert.equal(event.status,    "CONNECTED", "Verifying status");
            assert.equal(event.targetVip, args.recipientVip, "Verifying targetVip");
            assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
            assert.equal(event.endpoint.vip, args.senderVip, "Verifying endpoint vip");

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
            assert.equal(event.endpoint.vip, args.senderVip, "Verifying endpoint vip");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        });
    });

    ChannelTestUtils.integrationTest("Channel Send Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointRecipient.onMessage = function(event) {
            Log.info(event.endpoint.vip, "message-test-handler", JSON.stringify(event));

            assert.ok(args.endpointRecipient.isConnected(event.sourceVip), "Verifying connection established");

            assert.equal(event.message,   "sent to recipient message", "Verifying message");
            assert.equal(event.sourceVip, args.senderVip, "Verifying sourceVip");
            assert.equal(event.endpoint, args.endpointRecipient, "Verifying endpoint");
            assert.equal(event.endpoint.vip, args.recipientVip, "Verifying endpoint vip");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        };

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            if(event.status != "CONNECTED") return;
            args.endpointSender.send(args.recipientVip, "sent to recipient message");
        });
    });


    ChannelTestUtils.integrationTest("Channel Send-Reply Test", function(assert, args) {
        var done = assert.async(1);

        args.endpointRecipient.onMessage = function(event) {
            Log.info(event.endpoint.vip, "message-test-handler", JSON.stringify(event));

            args.endpointRecipient.send(args.senderVip, "pong to: " + event.message);
        };

        args.endpointSender.onMessage = function(event) {

            assert.equal(event.message,   "pong to: sent to recipient message", "Verifying message");
            assert.equal(event.sourceVip, args.recipientVip, "Verifying sourceVip");
            assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
            assert.equal(event.endpoint.vip, args.senderVip, "Verifying endpoint vip");

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        };

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            args.endpointSender.send(args.recipientVip, "sent to recipient message");
        });
    });


    ChannelTestUtils.integrationTest("Channel No-Connection exception test", function(assert, args) {
        var done = assert.async(1);

        assert.throws(
            function() {
                args.endpointSender.send(args.recipientVip, "sent to recipient message");
            },  "Connection to endpoint 'recipient' isn't established");

        args.endpointRecipient.destroy();
        args.endpointSender.destroy();

        done();
    });
});