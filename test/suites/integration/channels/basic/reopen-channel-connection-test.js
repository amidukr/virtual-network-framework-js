import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";
import {ChannelTestUtils} from "../../../../../test/utils/channel-test-utils.js";

QUnit.module("Channel Open Connection Tests", (hooks) => {

    ChannelTestUtils.integrationTest("Test reopen of closed-connection - close by sender open by sender test", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointSender.closeConnection(args.recipientEva);

                args.endpointSender.openConnection(args.recipientEva, function(event){
                    assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                    args.endpointRecipient.openConnection(args.senderEva, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                        args.endpointSender.destroy();
                        args.endpointRecipient.destroy();
                        done();
                    });
                });
            });
        });
    });

    ChannelTestUtils.integrationTest("Test reopen of closed-connection - close by recipient open by recipient test", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointRecipient.closeConnection(args.senderEva);

                args.endpointRecipient.openConnection(args.senderEva, function(event){
                    assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                    args.endpointSender.openConnection(args.recipientEva, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                        args.endpointSender.destroy();
                        args.endpointRecipient.destroy();
                        done();
                    });
                });
            });
        });
    });

    ChannelTestUtils.integrationTest("Test reopen of closed-connection - close by sender open by recipient test", function(assert, args) {
        var done = assert.async(1);
        var testDone = false;

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointRecipient.onConnectionLost(function(targetEva){
                    if(testDone) return;

                    assert.equal(targetEva, args.senderEva, "Verifying connection-lost targetEva argument");
                    args.endpointRecipient.openConnection(args.senderEva, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                        args.endpointSender.openConnection(args.recipientEva, function(event){
                            assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                            testDone = true;

                            args.endpointSender.destroy();
                            args.endpointRecipient.destroy();
                            done();
                        });
                    });
                });

                args.endpointSender.closeConnection(args.recipientEva);
            });
        });
    });


    ChannelTestUtils.integrationTest("Test reopen of closed-connection - close by recipient open by sender test", function(assert, args) {
        var done = assert.async(1);
        var testDone = false;

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointSender.onConnectionLost(function(targetEva){
                    if(testDone) return;

                    assert.equal(targetEva, args.recipientEva, "Verifying connection-lost targetEva argument");
                    args.endpointSender.openConnection(args.recipientEva, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                        args.endpointRecipient.openConnection(args.senderEva, function(event){
                            assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                            testDone = true;

                            args.endpointSender.destroy();
                            args.endpointRecipient.destroy();
                            done();
                        });
                    });
                });

                args.endpointRecipient.closeConnection(args.senderEva);
            });
        });
    });

    ChannelTestUtils.integrationTest("Test reopen of connection to destroyed - destroy sender open by recipient", function(assert, args) {
        var done = assert.async(1);
        var testDone = false;

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointRecipient.onConnectionLost(function(targetEva){
                    if(testDone) return;

                    assert.equal(targetEva, args.senderEva, "Verifying connection-lost targetEva argument");
                    args.endpointRecipient.openConnection(args.senderEva, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                        args.endpointSender.openConnection(args.recipientEva, function(event){
                            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                            testDone = true;

                            args.endpointSender.destroy();
                            args.endpointRecipient.destroy();
                            done();
                        });
                    });
                });

                args.endpointSender.destroy();
                args.endpointSender = args.vnfHub.openEndpoint(args.senderEva);
            });
        });
    });

    ChannelTestUtils.integrationTest("Test reopen of connection to destroyed - destroy recipient open by sender", function(assert, args) {
        var done = assert.async(1);
        var testDone = false;

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointSender.onConnectionLost(function(targetEva){
                    if(testDone) return;

                    assert.equal(targetEva, args.recipientEva, "Verifying connection-lost targetEva argument");
                    args.endpointSender.openConnection(args.recipientEva, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                        args.endpointRecipient.openConnection(args.senderEva, function(event){
                            assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                            testDone = true;

                            args.endpointSender.destroy();
                            args.endpointRecipient.destroy();
                            done();
                        });
                    });
                });

                args.endpointRecipient.destroy();
                args.endpointRecipient = args.vnfHub.openEndpoint(args.recipientEva);
            });
        });
    });

    ChannelTestUtils.integrationTest("Test reopen of connection to destroyed - destroy sender open by sender", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointSender.destroy();
                args.endpointSender = args.vnfHub.openEndpoint(args.senderEva);
                args.endpointSender.openConnection(args.recipientEva, function(event){
                    assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                    args.endpointRecipient.openConnection(args.senderEva, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                        args.endpointSender.destroy();
                        args.endpointRecipient.destroy();
                        done();
                    });
                });
            });
        });
    });

    ChannelTestUtils.integrationTest("Test reopen of connection to destroyed - destroy recipient open by recipient", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientEva, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderEva, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointRecipient.destroy();
                args.endpointRecipient = args.vnfHub.openEndpoint(args.recipientEva);
                args.endpointRecipient.openConnection(args.senderEva, function(event){
                    assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                    args.endpointSender.openConnection(args.recipientEva, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                        args.endpointSender.destroy();
                        args.endpointRecipient.destroy();
                        done();
                    });
                });
            });
        });
    });
});