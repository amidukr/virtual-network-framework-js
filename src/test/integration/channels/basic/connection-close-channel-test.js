requirejs([ "vnf/vnf",
            "utils/signal-captor",
            "utils/logger",
            "test/utils/vnf-test-utils",
            "test/utils/channel-test-utils",
            "test/utils/channel-test-utils"],
function(  Vnf,
           SignalCaptor,
           Log,
           VnfTestUtils,
           ChannelTestUtils){

    QUnit.module("Channel Connection Test Tests");
    ChannelTestUtils.integrationTest("Connection close - close by sender", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection("recipient", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            args.endpointRecipient.openConnection("sender", function(event) {
                assert.equal(event.status, "CONNECTED", "Verifying status");

                args.endpointSender.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, "recipient");
                    doneCaptor.signal("done-1");
                });


                args.endpointRecipient.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, "sender");
                    doneCaptor.signal("done-2");
                })

                args.endpointSender.closeConnection("recipient");
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

        args.endpointSender.openConnection("recipient", function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying status");


            args.endpointSender.onConnectionLost(function(targetVip){
                assert.equal(targetVip, "recipient");
                doneCaptor.signal("done-1");
            })

            args.endpointRecipient.onConnectionLost(function(targetVip){
                assert.equal(targetVip, "sender");
                doneCaptor.signal("done-2");
            })

            args.endpointRecipient.openConnection("sender", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");
                args.endpointRecipient.closeConnection("sender");
            });
        });


        doneCaptor.assertSignalsUnordered(["done-1", "done-2"])
            .then(args.endpointRecipient.destroy)
            .then(args.endpointSender.destroy)
        .then(done);
    });


    ChannelTestUtils.integrationTest("Connection close - sender destroy", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection("recipient", function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying status");
            args.endpointRecipient.openConnection("sender", function(event) {
                assert.equal(event.status, "CONNECTED", "Verifying status");


                args.endpointSender.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, "recipient");
                    doneCaptor.signal("done-1");
                })

                args.endpointRecipient.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, "sender");
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

        args.endpointSender.openConnection("recipient", function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying status");


            args.endpointSender.onConnectionLost(function(targetVip){
                assert.equal(targetVip, "recipient", "Verifying onConnectionLost argument");
                doneCaptor.signal("done-1");
            })

            args.endpointRecipient.onConnectionLost(function(targetVip){
                assert.equal(targetVip, "sender", "Verifying onConnectionLost argument");
                doneCaptor.signal("done-2");
            })

            args.endpointRecipient.openConnection("sender", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");
                args.endpointRecipient.destroy();
            });
        });


        doneCaptor.assertSignalsUnordered(["done-1", "done-2"])
            .then(args.endpointSender.destroy)
        .then(done);
    });

    ChannelTestUtils.integrationTest("Close connection - Channel No-Connection exception test", function(assert, args) {
        var done = assert.async(1);

        args.endpointSender.openConnection("recipient", function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying status");

            args.endpointRecipient.openConnection("sender", function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying status");

                args.endpointRecipient.onConnectionLost(function(targetVip){
                    assert.equal(targetVip, "sender");

                    assert.throws(
                        function() {
                            args.endpointRecipient.send("sender", "to sender message");
                        },  "Connection to endpoint 'recipient' isn't established");

                    args.endpointRecipient.destroy();
                    args.endpointSender.destroy();

                    done();
                })

                args.endpointSender.closeConnection("recipient");

                assert.throws(
                    function() {
                        args.endpointSender.send("recipient", "to recipient message");
                    },  "Connection to endpoint 'recipient' isn't established");
            });
        });
    });
})
