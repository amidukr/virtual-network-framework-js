import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";
import {ChannelTestUtils} from "../../../../../test/utils/channel-test-utils.js";

QUnit.module("Channel Open Connection Tests", (hooks) => {

    var prevCaptorTimeout = -1;

    hooks.beforeEach(function(assert){
         prevCaptorTimeout = Timeouts.logCaptureTimeout;
         Timeouts.logCaptureTimeout = 30000;
         assert.timeout( 30000 );
    });

    hooks.afterEach(function() {
        Timeouts.logCaptureTimeout = prevCaptorTimeout;
    });

    ChannelTestUtils.integrationTest("Test reopen of closed-connection - close by sender open by sender test", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointSender.closeConnection(args.recipientVip);

                args.endpointSender.openConnection(args.recipientVip, function(event){
                    assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                    args.endpointRecipient.openConnection(args.senderVip, function(event){
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

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointRecipient.closeConnection(args.senderVip);

                args.endpointRecipient.openConnection(args.senderVip, function(event){
                    assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                    args.endpointSender.openConnection(args.recipientVip, function(event){
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

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointRecipient.onConnectionLost(function(targetVip){
                    if(testDone) return;

                    assert.equal(targetVip, args.senderVip, "Verifying connection-lost targetVip argument");
                    args.endpointRecipient.openConnection(args.senderVip, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                        args.endpointSender.openConnection(args.recipientVip, function(event){
                            assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                            testDone = true;

                            args.endpointSender.destroy();
                            args.endpointRecipient.destroy();
                            done();
                        });
                    });
                });

                args.endpointSender.closeConnection(args.recipientVip);
            });
        });
    });


    ChannelTestUtils.integrationTest("Test reopen of closed-connection - close by recipient open by sender test", function(assert, args) {
        var done = assert.async(1);
        var testDone = false;

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointSender.onConnectionLost(function(targetVip){
                    if(testDone) return;

                    assert.equal(targetVip, args.recipientVip, "Verifying connection-lost targetVip argument");
                    args.endpointSender.openConnection(args.recipientVip, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                        args.endpointRecipient.openConnection(args.senderVip, function(event){
                            assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                            testDone = true;

                            args.endpointSender.destroy();
                            args.endpointRecipient.destroy();
                            done();
                        });
                    });
                });

                args.endpointRecipient.closeConnection(args.senderVip);
            });
        });
    });

    ChannelTestUtils.integrationTest("Test reopen of connection to destroyed - destroy sender open by recipient", function(assert, args) {
        var done = assert.async(1);
        var testDone = false;

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointRecipient.onConnectionLost(function(targetVip){
                    if(testDone) return;

                    assert.equal(targetVip, args.senderVip, "Verifying connection-lost targetVip argument");
                    args.endpointRecipient.openConnection(args.senderVip, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                        args.endpointSender.openConnection(args.recipientVip, function(event){
                            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                            testDone = true;

                            args.endpointSender.destroy();
                            args.endpointRecipient.destroy();
                            done();
                        });
                    });
                });

                args.endpointSender.destroy();
                args.endpointSender = args.vnfHub.openEndpoint(args.senderVip);
            });
        });
    });

    ChannelTestUtils.integrationTest("Test reopen of connection to destroyed - destroy recipient open by sender", function(assert, args) {
        var done = assert.async(1);
        var testDone = false;

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointSender.onConnectionLost(function(targetVip){
                    if(testDone) return;

                    assert.equal(targetVip, args.recipientVip, "Verifying connection-lost targetVip argument");
                    args.endpointSender.openConnection(args.recipientVip, function(event){
                        assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                        args.endpointRecipient.openConnection(args.senderVip, function(event){
                            assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                            testDone = true;

                            args.endpointSender.destroy();
                            args.endpointRecipient.destroy();
                            done();
                        });
                    });
                });

                args.endpointRecipient.destroy();
                args.endpointRecipient = args.vnfHub.openEndpoint(args.recipientVip);
            });
        });
    });

    ChannelTestUtils.integrationTest("Test reopen of connection to destroyed - destroy sender open by sender", function(assert, args) {
        var done = assert.async(1);

        var doneCaptor = new SignalCaptor(assert);

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointSender.destroy();
                args.endpointSender = args.vnfHub.openEndpoint(args.senderVip);
                args.endpointSender.openConnection(args.recipientVip, function(event){
                    assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

                    args.endpointRecipient.openConnection(args.senderVip, function(event){
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

        args.endpointSender.openConnection(args.recipientVip, function(event){
            assert.equal(event.status,    "CONNECTED", "Verifying sender connection status");

            args.endpointRecipient.openConnection(args.senderVip, function(event){
                assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                args.endpointRecipient.destroy();
                args.endpointRecipient = args.vnfHub.openEndpoint(args.recipientVip);
                args.endpointRecipient.openConnection(args.senderVip, function(event){
                    assert.equal(event.status,    "CONNECTED", "Verifying recipient connection status");

                    args.endpointSender.openConnection(args.recipientVip, function(event){
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