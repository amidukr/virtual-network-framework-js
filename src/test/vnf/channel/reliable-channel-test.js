requirejs(["vnf/vnf",
           "utils/signal-captor",
           "utils/logger",
           "test/vnf-test-utils"],
function(  VNF,
           SignalCaptor,
           Log,
           VNFTestUtils){

    //TODO: suspend
    //TODO: verify new reliable channel, destroyed previously - this test should fail
    //        open two endpoints, send couple message, drop one endpoint,
    //        wait heartbeat, open another endpoint, send message
    //           onHeartbeat - listener would be helpful
    //
    //TODO: multiple channel - WebRTC vs WebSocket - multiple chanmel it is different hub implementation
    //TODO: generic channel support

     QUnit.module("Reliable Channel Tests");
     QUnit.test("[Unreliable Hub]: Testing Unreliable hub", function(assert){
            Log.info("test", "[Unreliable Hub]: Testing Unreliable hub");

            var done = assert.async(1);

            var unreliableHub = new VNF.UnreliableHub(new VNF.InBrowserHub());

            var endpoint1 = unreliableHub.openEndpoint("vip-1");
            var endpoint2 = unreliableHub.openEndpoint("vip-2");

            var capture1 = new SignalCaptor(assert);

            endpoint2.onMessage = VNFTestUtils.newPrintCallback(capture1, "vip-2");



            endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
            unreliableHub.blockChannel("vip-1", "vip-2");
            endpoint1.send("vip-2", "vip-1-to-vip-2-message-error");
            unreliableHub.unblockChannel("vip-1", "vip-2");
            endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-2");

            capture1.assertSignals(["from vip-1: vip-1-to-vip-2-message-delivered-1",
                                "from vip-1: vip-1-to-vip-2-message-delivered-2"])
            .then(done);
    });

    QUnit.test("[Reliable Hub]: Testing of Redelivering Lost Messages - Middle", function(assert){
        Log.info("test", "[Reliable Hub]: Testing of Redelivering Lost Messages - Middle");

        var done = assert.async(1);

        var unreliableHub = new VNF.UnreliableHub(new VNF.InBrowserHub());
        var reliableHub = new VNF.ReliableHub(unreliableHub);

        var endpoint1 = reliableHub.openEndpoint("vip-1");
        var endpoint2 = reliableHub.openEndpoint("vip-2");

        var capture2 = new SignalCaptor(assert);

        endpoint2.onMessage = VNFTestUtils.newPrintCallback(capture2, "vip-2");

        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error");
        unreliableHub.unblockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-2");



        capture2.assertSignals(["from vip-1: vip-1-to-vip-2-message-delivered-1",
                            "from vip-1: vip-1-to-vip-2-message-error",
                            "from vip-1: vip-1-to-vip-2-message-delivered-2"])
        .then(endpoint1.destroy)
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: Testing of Redelivering Lost Messages - End", function(assert){
        Log.info("test", "[Reliable Hub]: Testing of Redelivering Lost Messages - End");

        var done = assert.async(1);

        var unreliableHub = new VNF.UnreliableHub(new VNF.InBrowserHub());
        var reliableHub = new VNF.ReliableHub(unreliableHub);

        var endpoint1 = reliableHub.openEndpoint("vip-1");
        var endpoint2 = reliableHub.openEndpoint("vip-2");

        var capture2 = new SignalCaptor(assert);

        endpoint2.onMessage = VNFTestUtils.newPrintCallback(capture2, "vip-2");

        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error-1");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error-2");
        unreliableHub.unblockChannel("vip-1", "vip-2");

        capture2.assertSignals(["from vip-1: vip-1-to-vip-2-message-delivered-1",
                            "from vip-1: vip-1-to-vip-2-message-error-1",
                            "from vip-1: vip-1-to-vip-2-message-error-2"])
        .then(endpoint1.destroy)
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: Testing of Redelivering Lost Messages - Multiple", function(assert){
        Log.info("test", "[Reliable Hub]: Testing of Redelivering Lost Messages - Multiple");

        var done = assert.async(1);

        var unreliableHub = new VNF.UnreliableHub(new VNF.InBrowserHub());
        var reliableHub = new VNF.ReliableHub(unreliableHub);

        var endpoint1 = reliableHub.openEndpoint("vip-1");
        var endpoint2 = reliableHub.openEndpoint("vip-2");

        var capture2 = new SignalCaptor(assert);

        endpoint2.onMessage = VNFTestUtils.newPrintCallback(capture2, "vip-2");

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


    QUnit.test("[Reliable Hub]: Send message to existing peer", function(assert){
        var done = assert.async(1);

        var reliableHub = new VNF.ReliableHub(new VNF.InBrowserHub());

        var endpoint1 = reliableHub.openEndpoint("vip-1");
        var endpoint2 = reliableHub.openEndpoint("vip-2");

        var capture2 = new SignalCaptor(assert);

        endpoint2.onMessage = VNFTestUtils.newPrintCallback(capture2, "vip-2");


        endpoint1.send("vip-2", "send-to-existing-connection-message-1");

        capture2.assertSignals(["from vip-1: send-to-existing-connection-message-1"])
        .then(VNFTestUtils.onHeartbeatPromise.bind(null, endpoint1))
        .then(VNFTestUtils.onHeartbeatPromise.bind(null, endpoint2))
        .then(function(){
            endpoint1.destroy();

            endpoint1 = reliableHub.openEndpoint("vip-1");

            endpoint1.send("vip-2", "send-to-existing-connection-message-2");
        }).then(capture2.assertSignals.bind(null, ["from vip-1: send-to-existing-connection-message-2"]))
        .then(function(){endpoint1.destroy();})
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: Receive message from existing peer", function(assert){
            var done = assert.async(1);

            var reliableHub = new VNF.ReliableHub(new VNF.InBrowserHub());

            var endpoint1V1 = reliableHub.openEndpoint("vip-1");
            var endpoint1V2;
            var endpoint2 = reliableHub.openEndpoint("vip-2");

            var capture1V1 = new SignalCaptor(assert);
            var capture1V2 = new SignalCaptor(assert);
            var capture2 = new SignalCaptor(assert);

            endpoint1V1.onMessage = VNFTestUtils.newPrintCallback(capture1V1, "vip-1-original");
            endpoint2.onConnectionLost(VNFTestUtils.newConnectionLostPrintCallback(capture2, "vip-2"));


            endpoint2.send("vip-1", "receive-from-existing-connection-message-1");

            capture1V1.assertSignals(["from vip-2: receive-from-existing-connection-message-1"])
            .then(VNFTestUtils.onHeartbeatPromise.bind(null, endpoint1V1))
            .then(VNFTestUtils.onHeartbeatPromise.bind(null, endpoint2))
            .then(endpoint1V1.destroy)
            .then(capture2.assertSignals.bind(null, ["from vip-1 connection lost"]))
            .then(function(){

                endpoint1V2 = reliableHub.openEndpoint("vip-1");

                endpoint1V2.onMessage = VNFTestUtils.newPrintCallback(capture1V2, "vip-1-new");

                endpoint2.send("vip-1", "receive-from-existing-connection-message-2");
            }).then(capture1V2.assertSignals.bind(null, ["from vip-2: receive-from-existing-connection-message-2"]))
            .then(function(){ endpoint1V2.destroy() })
            .then(endpoint2.destroy)
            .then(done);
    });

    QUnit.test("[Reliable Hub]: RTC Connection restore test", function(assert){
        Log.info("test", "[Reliable Hub]: RTC Connection restore test");

        var done = assert.async(1);

        var rtcHub = new VNF.RTCHub(new VNF.InBrowserHub(), {heartbeatsToInvalidate: 3000});
        var reliableHub = new VNF.ReliableHub(rtcHub);

        var endpoint1 = reliableHub.openEndpoint("vip-1");
        var endpoint2 = reliableHub.openEndpoint("vip-2");

        var rtcEndpoint1 = rtcHub.openEndpoint("vip-1");
        var rtcEndpoint2 = rtcHub.openEndpoint("vip-2");

        var capture2 = new SignalCaptor(assert);
        endpoint2.onMessage = VNFTestUtils.newPrintCallback(capture2, "vip-2");


        endpoint1.send("vip-2", "rtc-message-1");
        endpoint1.send("vip-2", "rtc-message-2");
        endpoint1.send("vip-2", "rtc-message-3");

        capture2.assertSignals(["from vip-1: rtc-message-1",
                            "from vip-1: rtc-message-2",
                            "from vip-1: rtc-message-3"])

        .then(function(){  rtcEndpoint1.getRTCConnection("vip-2").close(); })

        .then(endpoint1.send.bind(null, "vip-2", "[rtc1-close]rtc-message-4"))
        .then(endpoint1.send.bind(null, "vip-2", "[rtc1-close]rtc-message-5"))

        .then(capture2.assertSignals.bind(null, ["from vip-1: [rtc1-close]rtc-message-4",
                                             "from vip-1: [rtc1-close]rtc-message-5"]))

        .then(function(){ rtcEndpoint2.getRTCConnection("vip-1").close(); })

        .then(endpoint1.send.bind(null, "vip-2", "[rtc2-close]rtc-message-6"))
        .then(endpoint1.send.bind(null, "vip-2", "[rtc2-close]rtc-message-7"))

        .then(capture2.assertSignals.bind(null, ["from vip-1: [rtc2-close]rtc-message-6",
                                             "from vip-1: [rtc2-close]rtc-message-7"]))

        .then(endpoint1.destroy)
        .then(endpoint2.destroy)
        .then(done);

    });
});