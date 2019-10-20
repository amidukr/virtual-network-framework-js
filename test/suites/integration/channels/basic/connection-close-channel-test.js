import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";
import {ChannelTestUtils} from "../../../../../test/utils/channel-test-utils.js";

QUnit.module("Channel Connection Close Tests", (hooks) => {

    ChannelTestUtils.integrationTest("Connection close - close by sender", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            args.endpointRecipient.openConnection(args.senderVip, function(event) {
                assert.equal(event.status, "CONNECTED", "Verifying status");

                args.endpointSender.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, args.recipientVip);
                    doneCaptor.signal("done-1");
                });


                args.endpointRecipient.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, args.senderVip);
                    doneCaptor.signal("done-2");
                })

                args.endpointSender.closeConnection(args.recipientVip);
            });
        });


        doneCaptor.assertSignalsUnordered(["done-1", "done-2"])
            .then(args.endpointRecipient.destroy)
            .then(args.endpointSender.destroy)
        .then(done);
    });

    ChannelTestUtils.integrationTest("Connection close - close by recipient", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying status");


            args.endpointSender.onConnectionLost(function(targetVip){
                assert.equal(targetVip, args.recipientVip);
                doneCaptor.signal("sender-connection-lost");
            })

            args.endpointRecipient.onConnectionLost(function(targetVip){
                assert.equal(targetVip, args.senderVip);
                doneCaptor.signal("recipient-connection-lost");
            })

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");
                args.endpointRecipient.closeConnection(args.senderVip);
            });
        });


        doneCaptor.assertSignalsUnordered(["sender-connection-lost", "recipient-connection-lost"])
            .then(args.endpointRecipient.destroy)
            .then(args.endpointSender.destroy)
        .then(done);
    });


    ChannelTestUtils.integrationTest("Connection close - sender destroy", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying status");
            args.endpointRecipient.openConnection(args.senderVip, function(event) {
                assert.equal(event.status, "CONNECTED", "Verifying status");


                args.endpointSender.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, args.recipientVip);
                    doneCaptor.signal("done-1");
                })

                args.endpointRecipient.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, args.senderVip);
                    doneCaptor.signal("done-2");
                })

                args.endpointSender.destroy();
            });
        });


        doneCaptor.assertSignalsUnordered(["done-1", "done-2"])
            .then(args.endpointRecipient.destroy)
        .then(done);
    });

    ChannelTestUtils.integrationTest("Connection close - recipient destroy", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying status");


            args.endpointSender.onConnectionLost(function(targetVip){
                assert.equal(targetVip, args.recipientVip, "Verifying onConnectionLost argument");
                doneCaptor.signal("endpointSender.onConnectionLost");
            })

            args.endpointRecipient.onConnectionLost(function(targetVip){
                assert.equal(targetVip, args.senderVip, "Verifying onConnectionLost argument");
                doneCaptor.signal("endpointRecipient.onConnectionLost");
            })

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");
                args.endpointRecipient.destroy();
            });
        });


        doneCaptor.assertSignalsUnordered(["endpointSender.onConnectionLost", "endpointRecipient.onConnectionLost"])
            .then(args.endpointSender.destroy)
        .then(done);
    });

    ChannelTestUtils.integrationTest("Close connection and send - Channel No-Connection exception test", function(assert, args) {
        var done = assert.async(1);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying status");

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying status");

                args.endpointRecipient.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, args.senderVip);

                    assert.throws(
                        function() {
                            args.endpointRecipient.send(args.senderVip, "to sender message");
                        },  "Connection to endpoint 'recipient' isn't established");

                    args.endpointRecipient.destroy();
                    args.endpointSender.destroy();

                    done();
                })

                args.endpointSender.closeConnection(args.recipientVip);

                assert.throws(
                    function() {
                        args.endpointSender.send(args.recipientVip, "to recipient message");
                    },  "Connection to endpoint 'recipient' isn't established");
            });
        });
    });

});