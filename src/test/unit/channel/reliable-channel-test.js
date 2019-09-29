import {SignalCaptor} from "../../../utils/signal-captor.js";
import {Log}          from "../../../utils/logger.js";

import {VnfTestUtils} from "../../utils/vnf-test-utils.js";

import {Vnf} from "../../../vnf/vnf.js";

 QUnit.module("Reliable Channel Tests");
 QUnit.test("[Unreliable Hub]: Testing Unreliable hub", function(assert){
        Log.info("test", "[Unreliable Hub]: Testing Unreliable hub");

        var done = assert.async(1);

        var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());

        var endpoint1 = unreliableHub.openEndpoint("vip-1");
        var endpoint2 = unreliableHub.openEndpoint("vip-2");

        var capture1 = new SignalCaptor(assert);

        endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture1, "vip-2");

        endpoint1.openConnection("vip-2", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
            unreliableHub.blockChannel("vip-1", "vip-2");
            endpoint1.send("vip-2", "vip-1-to-vip-2-message-error");
            unreliableHub.unblockChannel("vip-1", "vip-2");
            endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-2");
        });

        capture1.assertSignals(["from vip-1: vip-1-to-vip-2-message-delivered-1",
                            "from vip-1: vip-1-to-vip-2-message-delivered-2"])
        .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Testing of Redelivering Lost Messages - Middle", function(assert){
    Log.info("test", "[Reliable Hub-2-Reliable Hub]: Testing of Redelivering Lost Messages - Middle");

    var done = assert.async(1);

    var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());
    var reliableHub = new Vnf.ReliableHub(unreliableHub);

    reliableHub.setHeartbeatInterval(50);
    reliableHub.setConnectionInvalidateInterval(500);
    reliableHub.setConnectionLostTimeout(1500);

    var endpoint1 = reliableHub.openEndpoint("vip-1");
    var endpoint2 = reliableHub.openEndpoint("vip-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "vip-2");

    endpoint1.openConnection("vip-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error");
        unreliableHub.unblockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-2");
    });

    capture2.assertSignals(["from vip-1: vip-1-to-vip-2-message-delivered-1",
                            "from vip-1: vip-1-to-vip-2-message-error",
                            "from vip-1: vip-1-to-vip-2-message-delivered-2"])

    .then(endpoint1.destroy)
    .then(endpoint2.destroy)
    .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Testing of Redelivering Lost Messages - End", function(assert){
    Log.info("test", "[Reliable Hub-2-Reliable Hub]: Testing of Redelivering Lost Messages - End");

    var done = assert.async(1);

    var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());
    var reliableHub = new Vnf.ReliableHub(unreliableHub);

    reliableHub.setHeartbeatInterval(50);
    reliableHub.setConnectionInvalidateInterval(500);
    reliableHub.setConnectionLostTimeout(1500);

    var endpoint1 = reliableHub.openEndpoint("vip-1");
    var endpoint2 = reliableHub.openEndpoint("vip-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "vip-2");
    endpoint1.openConnection("vip-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error-1");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error-2");
        unreliableHub.unblockChannel("vip-1", "vip-2");
    });

    capture2.assertSignals(["from vip-1: vip-1-to-vip-2-message-delivered-1",
                        "from vip-1: vip-1-to-vip-2-message-error-1",
                        "from vip-1: vip-1-to-vip-2-message-error-2"])
    .then(endpoint1.destroy)
    .then(endpoint2.destroy)
    .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Testing of Retrying Handshakes", function(assert){
    Log.info("test", "[Reliable Hub-2-Reliable Hub]: Testing of Retrying Handshakes");

    var done = assert.async(1);

    var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());
    var reliableHub = new Vnf.ReliableHub(unreliableHub);

    reliableHub.setHeartbeatInterval(50);
    reliableHub.setConnectionInvalidateInterval(500);
    reliableHub.setConnectionLostTimeout(1500);

    var endpoint1 = reliableHub.openEndpoint("vip-1");
    var endpoint2 = reliableHub.openEndpoint("vip-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "vip-2");

    unreliableHub.blockChannel("vip-1", "vip-2");
    endpoint1.openConnection("vip-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error");
        unreliableHub.unblockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-2");
    });
    unreliableHub.unblockChannel("vip-1", "vip-2");

    capture2.assertSignals(["from vip-1: vip-1-to-vip-2-message-delivered-1",
                            "from vip-1: vip-1-to-vip-2-message-error",
                            "from vip-1: vip-1-to-vip-2-message-delivered-2"])

    .then(endpoint1.destroy)
    .then(endpoint2.destroy)
    .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Testing of Redelivering Lost Messages - Multiple", function(assert){
    Log.info("test", "[Reliable Hub-2-Reliable Hub]: Testing of Redelivering Lost Messages - Multiple");

    var done = assert.async(1);

    var unreliableHub = new Vnf.UnreliableHub(new Vnf.InBrowserHub());
    var reliableHub = new Vnf.ReliableHub(unreliableHub);

    reliableHub.setHeartbeatInterval(50);
    reliableHub.setConnectionInvalidateInterval(500);
    reliableHub.setConnectionLostTimeout(1500);

    var endpoint1 = reliableHub.openEndpoint("vip-1");
    var endpoint2 = reliableHub.openEndpoint("vip-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "vip-2");

    endpoint1.openConnection("vip-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        endpoint1.send("vip-2", "vip-1-to-vip-2-message-1");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-3");
        unreliableHub.unblockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-4");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-5");
        unreliableHub.unblockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-6");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-7");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-8");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-9");
        unreliableHub.unblockChannel("vip-1", "vip-2");
    });

    capture2.assertSignals(["from vip-1: vip-1-to-vip-2-message-1",
                        "from vip-1: vip-1-to-vip-2-message-2",
                        "from vip-1: vip-1-to-vip-2-message-3",
                        "from vip-1: vip-1-to-vip-2-message-4",
                        "from vip-1: vip-1-to-vip-2-message-5",
                        "from vip-1: vip-1-to-vip-2-message-6",
                        "from vip-1: vip-1-to-vip-2-message-7",
                        "from vip-1: vip-1-to-vip-2-message-8",
                        "from vip-1: vip-1-to-vip-2-message-9"])
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

    var endpoint1 = reliableHub.openEndpoint("vip-1");
    var endpoint2 = reliableHub.openEndpoint("vip-2");

    var capture2 = new SignalCaptor(assert);

    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "vip-2");

    endpoint1.openConnection("vip-2", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        endpoint1.send("vip-2", "send-to-existing-connection-message-1");
    });

    capture2.assertSignals(["from vip-1: send-to-existing-connection-message-1"])
    .then(function(){
        endpoint1.destroy();

        endpoint1 = reliableHub.openEndpoint("vip-1");

        endpoint1.openConnection("vip-2", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            endpoint1.send("vip-2", "send-to-existing-connection-message-2");
        });
    }).then(capture2.assertSignals.bind(null, ["from vip-1: send-to-existing-connection-message-2"]))
    .then(function(){endpoint1.destroy();})
    .then(endpoint2.destroy)
    .then(done);
});

QUnit.test("[Reliable Hub-2-Reliable Hub]: Receive message from existing peer", function(assert){
        var done = assert.async(1);

        var reliableHub = new Vnf.ReliableHub(new Vnf.InBrowserHub());

        var endpoint1V1 = reliableHub.openEndpoint("vip-1");
        var endpoint1V2;
        var endpoint2 = reliableHub.openEndpoint("vip-2");

        var capture1V1 = new SignalCaptor(assert);
        var capture1V2 = new SignalCaptor(assert);
        var capture2 = new SignalCaptor(assert);

        endpoint1V1.onMessage = VnfTestUtils.newPrintCallback(capture1V1, "vip-1-original");
        endpoint2.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(capture2, "vip-2"));

        endpoint2.openConnection("vip-1", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            endpoint2.send("vip-1", "receive-from-existing-connection-message-1");
        });

        capture1V1.assertSignals(["from vip-2: receive-from-existing-connection-message-1"])
        .then(endpoint1V1.destroy)
        .then(capture2.assertSignals.bind(null, ["from vip-1 connection lost"]))
        .then(function(){

            endpoint1V2 = reliableHub.openEndpoint("vip-1");

            endpoint1V2.onMessage = VnfTestUtils.newPrintCallback(capture1V2, "vip-1-new");

            endpoint2.openConnection("vip-1", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");

                endpoint2.send("vip-1", "receive-from-existing-connection-message-2");
            });

        }).then(capture1V2.assertSignals.bind(null, ["from vip-2: receive-from-existing-connection-message-2"]))
        .then(function(){ endpoint1V2.destroy() })
        .then(endpoint2.destroy)
        .then(done);
});
