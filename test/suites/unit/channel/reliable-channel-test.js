import {SignalCaptor} from "../../../../src/utils/signal-captor.js";
import {Log}          from "../../../../src/utils/logger.js";

import {VnfTestUtils} from "../../../utils/vnf-test-utils.js";

import {Vnf} from "../../../../src/vnf/vnf.js";

 QUnit.module("Reliable Channel Tests");
 QUnit.test("[Unreliable Hub]: Testing Unreliable hub", function(assert){
        var done = assert.async(1);

        var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());

        var endpoint1 = unreliableHub.openEndpoint("eva-1");
        var endpoint2 = unreliableHub.openEndpoint("eva-2");

        var capture1 = new SignalCaptor(assert);

        endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture1, "eva-2");

        endpoint1.openConnection("eva-2", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");

            endpoint1.send("eva-2", "eva-1-to-eva-2-message-delivered-1");
            unreliableHub.blockChannel("eva-1", "eva-2");
            endpoint1.send("eva-2", "eva-1-to-eva-2-message-error");
            unreliableHub.unblockChannel("eva-1", "eva-2");
            endpoint1.send("eva-2", "eva-1-to-eva-2-message-delivered-2");
        });

        capture1.assertSignals(["from eva-1: eva-1-to-eva-2-message-delivered-1",
                            "from eva-1: eva-1-to-eva-2-message-delivered-2"])
        .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Testing of Redelivering Lost Messages - Middle", function(assert){
    var done = assert.async(1);

    var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());
    var reliableHub = new Vnf.ReliableHub(unreliableHub);

    reliableHub.setHeartbeatInterval(50);
    reliableHub.setConnectionInvalidateInterval(500);
    reliableHub.setConnectionLostTimeout(1500);

    var endpoint1 = reliableHub.openEndpoint("eva-1");
    var endpoint2 = reliableHub.openEndpoint("eva-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "eva-2");

    endpoint1.openConnection("eva-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        endpoint1.send("eva-2", "eva-1-to-eva-2-message-delivered-1");
        unreliableHub.blockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-error");
        unreliableHub.unblockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-delivered-2");
    });

    capture2.assertSignals(["from eva-1: eva-1-to-eva-2-message-delivered-1",
                            "from eva-1: eva-1-to-eva-2-message-error",
                            "from eva-1: eva-1-to-eva-2-message-delivered-2"])

    .then(endpoint1.destroy)
    .then(endpoint2.destroy)
    .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Testing of Redelivering Lost Messages - End", function(assert){
    var done = assert.async(1);

    var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());
    var reliableHub = new Vnf.ReliableHub(unreliableHub);

    reliableHub.setHeartbeatInterval(50);
    reliableHub.setConnectionInvalidateInterval(500);
    reliableHub.setConnectionLostTimeout(1500);

    var endpoint1 = reliableHub.openEndpoint("eva-1");
    var endpoint2 = reliableHub.openEndpoint("eva-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "eva-2");
    endpoint1.openConnection("eva-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        endpoint1.send("eva-2", "eva-1-to-eva-2-message-delivered-1");
        unreliableHub.blockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-error-1");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-error-2");
        unreliableHub.unblockChannel("eva-1", "eva-2");
    });

    capture2.assertSignals(["from eva-1: eva-1-to-eva-2-message-delivered-1",
                        "from eva-1: eva-1-to-eva-2-message-error-1",
                        "from eva-1: eva-1-to-eva-2-message-error-2"])
    .then(endpoint1.destroy)
    .then(endpoint2.destroy)
    .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Testing of Retrying Handshakes", function(assert){
    var done = assert.async(1);

    var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());
    var reliableHub = new Vnf.ReliableHub(unreliableHub);

    reliableHub.setHeartbeatInterval(50);
    reliableHub.setConnectionInvalidateInterval(500);
    reliableHub.setConnectionLostTimeout(1500);

    var endpoint1 = reliableHub.openEndpoint("eva-1");
    var endpoint2 = reliableHub.openEndpoint("eva-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "eva-2");

    unreliableHub.blockChannel("eva-1", "eva-2");
    endpoint1.openConnection("eva-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        endpoint1.send("eva-2", "eva-1-to-eva-2-message-delivered-1");
        unreliableHub.blockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-error");
        unreliableHub.unblockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-delivered-2");
    });
    unreliableHub.unblockChannel("eva-1", "eva-2");

    capture2.assertSignals(["from eva-1: eva-1-to-eva-2-message-delivered-1",
                            "from eva-1: eva-1-to-eva-2-message-error",
                            "from eva-1: eva-1-to-eva-2-message-delivered-2"])

    .then(endpoint1.destroy)
    .then(endpoint2.destroy)
    .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Testing of Redelivering Lost Messages - Multiple", function(assert){
    var done = assert.async(1);

    var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());
    var reliableHub = new Vnf.ReliableHub(unreliableHub);

    reliableHub.setHeartbeatInterval(50);
    reliableHub.setConnectionInvalidateInterval(500);
    reliableHub.setConnectionLostTimeout(1500);

    var endpoint1 = reliableHub.openEndpoint("eva-1");
    var endpoint2 = reliableHub.openEndpoint("eva-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "eva-2");

    endpoint1.openConnection("eva-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        endpoint1.send("eva-2", "eva-1-to-eva-2-message-1");
        unreliableHub.blockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-3");
        unreliableHub.unblockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-4");
        unreliableHub.blockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-5");
        unreliableHub.unblockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-6");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-7");
        unreliableHub.blockChannel("eva-1", "eva-2");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-8");
        endpoint1.send("eva-2", "eva-1-to-eva-2-message-9");
        unreliableHub.unblockChannel("eva-1", "eva-2");
    });

    capture2.assertSignals(["from eva-1: eva-1-to-eva-2-message-1",
                        "from eva-1: eva-1-to-eva-2-message-2",
                        "from eva-1: eva-1-to-eva-2-message-3",
                        "from eva-1: eva-1-to-eva-2-message-4",
                        "from eva-1: eva-1-to-eva-2-message-5",
                        "from eva-1: eva-1-to-eva-2-message-6",
                        "from eva-1: eva-1-to-eva-2-message-7",
                        "from eva-1: eva-1-to-eva-2-message-8",
                        "from eva-1: eva-1-to-eva-2-message-9"])
    .then(endpoint1.destroy)
    .then(endpoint2.destroy)
    .then(done);
});


QUnit.test("[Reliable Hub-2-Reliable Hub]: Send message to existing peer", function(assert){
    var done = assert.async(1);

    var reliableHub = new Vnf.ReliableHub(new Vnf.InBrowserHub());

    reliableHub.setHeartbeatInterval(100);
    reliableHub.setConnectionInvalidateInterval(200);
    reliableHub.setConnectionLostTimeout(200);

    var endpoint1 = reliableHub.openEndpoint("eva-1");
    var endpoint2 = reliableHub.openEndpoint("eva-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "eva-2");

    endpoint1.openConnection("eva-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        endpoint1.send("eva-2", "send-to-existing-connection-message-1");
    });

    capture2.assertSignals(["from eva-1: send-to-existing-connection-message-1"])
    .then(function(){
        endpoint1.destroy();

        endpoint1 = reliableHub.openEndpoint("eva-1");

        endpoint1.openConnection("eva-2", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");

            endpoint1.send("eva-2", "send-to-existing-connection-message-2");
        });
    }).then(capture2.assertSignals.bind(null, ["from eva-1: send-to-existing-connection-message-2"]))
    .then(function(){endpoint1.destroy();})
    .then(endpoint2.destroy)
    .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Receive message from existing peer", function(assert){
        var done = assert.async(1);

        var reliableHub = new Vnf.ReliableHub(new Vnf.InBrowserHub());

        var endpoint1V1 = reliableHub.openEndpoint("eva-1");
        var endpoint1V2;
        var endpoint2 = reliableHub.openEndpoint("eva-2");

        var capture1V1 = new SignalCaptor(assert);
        var capture1V2 = new SignalCaptor(assert);
        var capture2 = new SignalCaptor(assert);

        endpoint1V1.onMessage = VnfTestUtils.newPrintCallback(capture1V1, "eva-1-original");
        endpoint2.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(capture2, "eva-2"));

        endpoint2.openConnection("eva-1", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");

            endpoint2.send("eva-1", "receive-from-existing-connection-message-1");
        });

        capture1V1.assertSignals(["from eva-2: receive-from-existing-connection-message-1"])
        .then(endpoint1V1.destroy)
        .then(capture2.assertSignals.bind(null, ["from eva-1 connection lost"]))
        .then(function(){

            endpoint1V2 = reliableHub.openEndpoint("eva-1");

            endpoint1V2.onMessage = VnfTestUtils.newPrintCallback(capture1V2, "eva-1-new");

            endpoint2.openConnection("eva-1", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying connection status");

                endpoint2.send("eva-1", "receive-from-existing-connection-message-2");
            });

        }).then(capture1V2.assertSignals.bind(null, ["from eva-2: receive-from-existing-connection-message-2"]))
        .then(function(){ endpoint1V2.destroy() })
        .then(endpoint2.destroy)
        .then(done);
});


QUnit.test("[Reliable Hub]: Reliable hub immediate modes - no heartbeats - timeout", function(assert){
    var done = assert.async(1);

    var reliableHub = new Vnf.ReliableHub(new Vnf.InBrowserHub());

    reliableHub.setHeartbeatInterval(100000);
    reliableHub.setConnectionInvalidateInterval(100000);
    reliableHub.setConnectionLostTimeout(100000);

    var endpoint1 = reliableHub.openEndpoint("eva-1");
    var endpoint2 = reliableHub.openEndpoint("eva-2");

    endpoint1.openConnection("eva-2", function(event) {
        assert.equal(event.status, "CONNECTED", "Verifying connection status");


        window.setTimeout(function(){
                assert.equal(endpoint1.isConnected("eva-2"), true, "Verifying endpoint1 connected to eva-2");
                assert.equal(endpoint2.isConnected("eva-1"), true, "Verifying endpoint2 connected to eva-1");

                endpoint1.closeConnection("eva-2");

                window.setTimeout(function(){

                    assert.equal(endpoint1.isConnected("eva-2"), false, "Verifying endpoint1 not connected to eva-2");
                    assert.equal(endpoint2.isConnected("eva-1"), false, "Verifying endpoint2 not connected to eva-1");

                    endpoint1.openConnection("eva-2", function(event) {
                        assert.equal(event.status, "CONNECTED", "Verifying connection status");

                        window.setTimeout(function(){
                            assert.equal(endpoint1.isConnected("eva-2"), true, "Verifying endpoint1 connected to eva-2");
                            assert.equal(endpoint2.isConnected("eva-1"), true, "Verifying endpoint2 connected to eva-1");

                            endpoint1.destroy();
                            endpoint2.destroy();

                            done();
                        }, 50);
                    });
                }, 50);
        }, 50);
    });
});

QUnit.test("[Reliable Hub]: Reliable hub immediate modes - no heartbeats - callbacks", function(assert){
    var done = assert.async(1);

    var reliableHub = new Vnf.ReliableHub(new Vnf.InBrowserHub());

    reliableHub.setHeartbeatInterval(100000);
    reliableHub.setConnectionInvalidateInterval(100000);
    reliableHub.setConnectionLostTimeout(100000);

    var endpoint1 = reliableHub.openEndpoint("eva-1");
    var endpoint2 = reliableHub.openEndpoint("eva-2");

    var tesDone = false;

    endpoint1.openConnection("eva-2", function(event) {
        assert.equal(event.status, "CONNECTED", "Verifying connection status");


        endpoint2.openConnection("eva-1", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");

            assert.equal(endpoint1.isConnected("eva-2"), true, "Verifying endpoint1 connected to eva-2");
            assert.equal(endpoint2.isConnected("eva-1"), true, "Verifying endpoint2 connected to eva-1");

            endpoint2.onConnectionLost(function onConnectionLost(){
                if(tesDone) return;

                assert.equal(endpoint1.isConnected("eva-2"), false, "Verifying endpoint1 not connected to eva-2");
                assert.equal(endpoint2.isConnected("eva-1"), false, "Verifying endpoint2 not connected to eva-1");

                endpoint1.openConnection("eva-2", function(event) {
                    assert.equal(event.status, "CONNECTED", "Verifying connection status");

                    endpoint2.openConnection("eva-2", function(event) {
                         assert.equal(endpoint1.isConnected("eva-2"), true, "Verifying endpoint1 connected to eva-2");
                         assert.equal(endpoint2.isConnected("eva-1"), true, "Verifying endpoint2 connected to eva-1");

                         tesDone = true;

                         endpoint1.destroy();
                         endpoint2.destroy();

                         done();
                    });
                });

            });

            endpoint1.closeConnection("eva-2");
        })
    });
});
