import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";
import {ChannelTestUtils} from "../../../../../test/utils/channel-test-utils.js";

QUnit.module("Channel Open Connection Tests");
ChannelTestUtils.integrationTest("Open connection in open connection", function(assert, args) {
     var done = assert.async(1);

     args.endpointSender.openConnection(args.recipientVip, function(event){
         assert.equal(event.status,    "CONNECTED", "Verifying status");

         args.endpointSender.openConnection(args.recipientVip, function(event){
             assert.equal(event.status,    "CONNECTED", "Verifying status");

             args.endpointRecipient.destroy();
             args.endpointSender.destroy();

             done();
         });
     });
});

ChannelTestUtils.integrationTest("Recipient open connection in Sender open connection callback", function(assert, args) {
     var done = assert.async(1);

     args.endpointSender.openConnection(args.recipientVip, function(event){
         assert.equal(event.status,    "CONNECTED", "Verifying status");

         args.endpointRecipient.openConnection(args.senderVip, function(event){
             assert.equal(event.status,    "CONNECTED", "Verifying status");

             args.endpointRecipient.destroy();
             args.endpointSender.destroy();

             done();
         });
     });
});

ChannelTestUtils.integrationTest("Open connection in on message", function(assert, args) {
    var done = assert.async(1);

    args.endpointSender.openConnection(args.recipientVip, function(event){
         assert.equal(event.status,    "CONNECTED", "Verifying status");

        args.endpointRecipient.onMessage = function(event) {
            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying status");

                args.endpointRecipient.destroy();
                args.endpointSender.destroy();

                done();
            })
        };

        args.endpointSender.send(args.recipientVip, "message-to-recipient");
    });
});

ChannelTestUtils.integrationTest("Concurrent open connection", function(assert, args) {
    var done = assert.async(1);

    var doneCaptor = new SignalCaptor(assert);

    args.endpointSender.openConnection(args.recipientVip, function(event){
        assert.equal(event.status,    "CONNECTED", "Verifying status");
        doneCaptor.signal("done-1");
    });

    args.endpointRecipient.openConnection(args.senderVip, function(event){
        assert.equal(event.status,    "CONNECTED", "Verifying status");
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

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.notOk(true, "First callback should be ignored");
        });

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.notOk(true, "Second callback should be ignored");
        });

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying status");

            // when connection establish all callback should be fired immediately

            args.endpointSender.openConnection(args.recipientVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying status");
                doneCaptor.signal("done-1");
            });

            args.endpointSender.openConnection(args.recipientVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying status");
                doneCaptor.signal("done-2");
            });

            args.endpointSender.openConnection(args.recipientVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying status");
                doneCaptor.signal("done-3");
            });
        });

        doneCaptor.assertSignalsUnordered(["done-1", "done-2", "done-3"])
            .then(args.endpointRecipient.destroy)
            .then(args.endpointSender.destroy)
        .then(done);
});

