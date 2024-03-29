import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";
import {ChannelTestUtils} from "../../../../../test/utils/channel-test-utils.js";

QUnit.module("Channel Open Connection Tests");
ChannelTestUtils.integrationTest("Open connection in open connection", function(assert, args) {
     var done = assert.async(1);

     args.endpointSender.openConnection(args.recipientEva, function(event){
         assert.equal(event.status,    "CONNECTED", "Verifying connection status");

         args.endpointSender.openConnection(args.recipientEva, function(event){
             assert.equal(event.status,    "CONNECTED", "Verifying connection status");

             args.endpointRecipient.destroy();
             args.endpointSender.destroy();

             done();
         });
     });
});

ChannelTestUtils.integrationTest("Recipient is not immediately available", function(assert, args) {
    var done = assert.async(1);

    var connected = false;
    var recipientCreated = false;

    var hub = args.vnfHub;

    hub.setRetryConnectAfterDelay(50);
    hub.setOpenConnectionRetries(100);

    args.endpointRecipient.destroy();
    args.endpointSender.openConnection(args.recipientEva, function(event) {
        assert.equal(event.status, "CONNECTED", "Verifying connection status");
        assert.equal(recipientCreated, true, "Verifying recipient created after some delay");
        connected = true;

        args.endpointRecipient.destroy();
        args.endpointSender.destroy();

        done();
    });

    window.setTimeout(function() {
        assert.equal(connected, false, "Verifying not yet connected after some delay");
        args.endpointRecipient = args.vnfHub.openEndpoint(args.recipientEva)
        recipientCreated = true;
    }, 300);
});

ChannelTestUtils.integrationTest("Close connection immediately after open", function(assert, args) {
    var done = assert.async(1);
    args.endpointSender.openConnection(args.recipientEva, function(event) {
        assert.equal(event.status, "FAILED", "Verifying openConnection status");
    });

    if(["InBrowser", "Big Message Factory", "Unreliable"].indexOf(args.channelName) != -1) {
        args.endpointSender.closeConnection(args.recipientEva);
    }else{
        window.setTimeout(args.endpointSender.closeConnection.bind(null, args.recipientEva), 10);
    }

    args.endpointRecipient.onConnectionOpen(function() {
        assert.notOk(true, "onConnectionOpen should not be called");
    });

    window.setTimeout(done, 1000);
});

ChannelTestUtils.integrationTest("Recipient open connection in Sender open connection callback", function(assert, args) {
     var done = assert.async(1);

     args.endpointSender.openConnection(args.recipientEva, function(event){
         assert.equal(event.status,    "CONNECTED", "Verifying connection status");

         args.endpointRecipient.openConnection(args.senderEva, function(event){
             assert.equal(event.status,    "CONNECTED", "Verifying connection status");

             args.endpointRecipient.destroy();
             args.endpointSender.destroy();

             done();
         });
     });
});

ChannelTestUtils.integrationTest("Open connection in on message", function(assert, args) {
    var done = assert.async(1);

    args.endpointSender.openConnection(args.recipientEva, function(event){
         assert.equal(event.status,    "CONNECTED", "Verifying connection status");

        args.endpointRecipient.onMessage = function(event) {
            args.endpointRecipient.openConnection(args.senderEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying connection status");

                args.endpointRecipient.destroy();
                args.endpointSender.destroy();

                done();
            })
        };

        args.endpointSender.send(args.recipientEva, "message-to-recipient");
    });
});

ChannelTestUtils.integrationTest("Concurrent open connection", function(assert, args) {
    var done = assert.async(1);

    var doneCaptor = new SignalCaptor(assert);

    args.endpointSender.openConnection(args.recipientEva, function(event){
        assert.equal(event.status,    "CONNECTED", "Verifying connection status");
        doneCaptor.signal("done-1");
    });

    args.endpointRecipient.openConnection(args.senderEva, function(event){
        assert.equal(event.status,    "CONNECTED", "Verifying connection status");
        doneCaptor.signal("done-2");
    });

    doneCaptor.assertSignalsUnordered(["done-1", "done-2"])
        .then(args.endpointRecipient.destroy)
        .then(args.endpointSender.destroy)
    .then(done);
});

ChannelTestUtils.integrationTest("Only last connection callback should fired", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.notOk(true, "First callback should be ignored");
        });

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.notOk(true, "Second callback should be ignored");
        });

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying connection status");

            // when connection establish all callback should be fired immediately

            args.endpointSender.openConnection(args.recipientEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying connection status");
                doneCaptor.signal("done-1");
            });

            args.endpointSender.openConnection(args.recipientEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying connection status");
                doneCaptor.signal("done-2");
            });

            args.endpointSender.openConnection(args.recipientEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying connection status");
                doneCaptor.signal("done-3");
            });
        });

        doneCaptor.assertSignalsUnordered(["done-1", "done-2", "done-3"])
            .then(args.endpointRecipient.destroy)
            .then(args.endpointSender.destroy)
        .then(done);
});

