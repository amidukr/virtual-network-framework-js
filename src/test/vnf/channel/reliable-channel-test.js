requirejs(["vnf/vnf",
           "utils/capture-logs",
           "test/vnf-test-utils"],
function(  VNF,
           Log,
           VNFTestUtils){

    function newPrintInvalidateCallback(sourceVip1) {
        return function(targetVip) {
            Log.info("invalidate-" + sourceVip1, "endpoint-invalidate", "invalidate called: " + sourceVip1 + " -> " + targetVip);
        }
    }

    //TODO: suspend
    //TODO: verify new reliable channel, destroyed previously - this test should fail
    //        open two endpoints, send couple message, drop one endpoint,
    //        wait heartbeat, open another endpoint, send message
    //           onHeartbeat - listener would be helpful
    //
    //TODO: multiple channel - WebRTC vs WebSocket - multiple chanmel it is different hub implementation
    //TODO: generic channel support

     QUnit.test("[Unreliable Hub]: Testing Unreliable hub", function(assert){
            Log.info("test", "[Unreliable Hub]: Testing Unreliable hub");

            var done = assert.async(1);

            var unreliableHub = new VNF.UnreliableHub(new VNF.InBrowserHub());

            var endpoint1 = unreliableHub.openEndpoint("vip-1");
            var endpoint2 = unreliableHub.openEndpoint("vip-2");

            endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

            var capture1 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

            endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
            unreliableHub.blockChannel("vip-1", "vip-2");
            endpoint1.send("vip-2", "vip-1-to-vip-2-message-error");
            unreliableHub.unblockChannel("vip-1", "vip-2");
            endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-2");

            capture1.assertLog(["from vip-1: vip-1-to-vip-2-message-delivered-1",
                                "from vip-1: vip-1-to-vip-2-message-delivered-2"])
            .then(done);
    });

    QUnit.test("[Reliable Hub]: Sending sequence numbers", function(assert){
        Log.info("test", "[Reliable Hub]: Sending sequence numbers");
        var done = assert.async(1);

        var inBrowserHub = new VNF.InBrowserHub();
        var reliableHub = new VNF.ReliableHub(inBrowserHub);

        var endpoint1 = reliableHub.openEndpoint("vip-1");
        var endpoint2 = inBrowserHub.openEndpoint("vip-2");

        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

        var capture1 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        endpoint1.send("vip-2", "message-1");
        endpoint1.send("vip-2", "message-2");
        endpoint1.send("vip-2", "message-3");

        capture1.assertLog(['from vip-1: {"type":"message","messageNumber":0,"message":"message-1"}',
                            'from vip-1: {"type":"message","messageNumber":1,"message":"message-2"}',
                            'from vip-1: {"type":"message","messageNumber":2,"message":"message-3"}'])
        .then(endpoint1.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: Reply with heartbeat and notifying successful delivery", function(assert){
        Log.info("test", "[Reliable Hub]: Reply with heartbeat and notifying successful delivery");
        var done = assert.async(1);

        var inBrowserHub = new VNF.InBrowserHub();
        var reliableHub = new VNF.ReliableHub(inBrowserHub);

        var endpoint1 = inBrowserHub.openEndpoint("vip-1");
        var endpoint2 =  reliableHub.openEndpoint("vip-2");

        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");

        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);

        endpoint1.send("vip-2", {"type":"message","messageNumber":0,"message":"message-1"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":1,"message":"message-2"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":2,"message":"message-3"});
        
        capture1.assertLog(['from vip-2: {"type":"heartbeat","gapBegin":3,"gapEnd":-1}'])
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: Gap detection", function(assert){
        Log.info("test", "[Reliable Hub]: Gap detection");
        var done = assert.async(1);

        var inBrowserHub = new VNF.InBrowserHub();
        var reliableHub = new VNF.ReliableHub(inBrowserHub);

        var endpoint1 = inBrowserHub.openEndpoint("vip-1");
        var endpoint2 =  reliableHub.openEndpoint("vip-2");

        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");

        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);

        endpoint1.send("vip-2", {"type":"message","messageNumber":0,"message":"message-1"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":3,"message":"message-3"});
        
        capture1.assertLog(['from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":2}'])
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: Response to gap - middle", function(assert){
        Log.info("test", "[Reliable Hub]: Response to gap - middle");
        var done = assert.async(1);

        var inBrowserHub = new VNF.InBrowserHub();
        var reliableHub = new VNF.ReliableHub(inBrowserHub);

        var endpoint1 = inBrowserHub.openEndpoint("vip-1");
        var endpoint2 =  reliableHub.openEndpoint("vip-2");

        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");

        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);

        endpoint2.send("vip-1", "message-1");
        endpoint2.send("vip-1", "message-2");
        endpoint2.send("vip-1", "message-3");
        endpoint2.send("vip-1", "message-4");
        endpoint2.send("vip-1", "message-5");

        capture1.assertLog(['from vip-2: {"type":"message","messageNumber":0,"message":"message-1"}',
                            'from vip-2: {"type":"message","messageNumber":1,"message":"message-2"}',
                            'from vip-2: {"type":"message","messageNumber":2,"message":"message-3"}',
                            'from vip-2: {"type":"message","messageNumber":3,"message":"message-4"}',
                            'from vip-2: {"type":"message","messageNumber":4,"message":"message-5"}'])
        .then(endpoint1.send.bind(endpoint1, "vip-2", {type:"heartbeat",gapBegin:2,gapEnd:3}))
        .then(capture1.assertLog.bind(capture1, ['from vip-2: {"type":"message","messageNumber":2,"message":"message-3"}',
                                                 'from vip-2: {"type":"message","messageNumber":3,"message":"message-4"}']))
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: Response to gap - end", function(assert){
        Log.info("test", "[Reliable Hub]: Response to gap - end");
        var done = assert.async(1);

        var inBrowserHub = new VNF.InBrowserHub();
        var reliableHub = new VNF.ReliableHub(inBrowserHub);

        var endpoint1 = inBrowserHub.openEndpoint("vip-1");
        var endpoint2 =  reliableHub.openEndpoint("vip-2");

        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");

        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);

        endpoint2.send("vip-1", "message-1");
        endpoint2.send("vip-1", "message-2");
        endpoint2.send("vip-1", "message-3");
        endpoint2.send("vip-1", "message-4");
        endpoint2.send("vip-1", "message-5");

        capture1.assertLog(['from vip-2: {"type":"message","messageNumber":0,"message":"message-1"}',
                            'from vip-2: {"type":"message","messageNumber":1,"message":"message-2"}',
                            'from vip-2: {"type":"message","messageNumber":2,"message":"message-3"}',
                            'from vip-2: {"type":"message","messageNumber":3,"message":"message-4"}',
                            'from vip-2: {"type":"message","messageNumber":4,"message":"message-5"}'])
        .then(endpoint1.send.bind(endpoint1, "vip-2", {type:"heartbeat",gapBegin:3,gapEnd:-1}))
        .then(capture1.assertLog.bind(capture1, ['from vip-2: {"type":"heartbeat","gapBegin":0,"gapEnd":-1}',
                                                 'from vip-2: {"type":"heartbeat","gapBegin":0,"gapEnd":-1}',
                                                 'from vip-2: {"type":"heartbeat","gapBegin":0,"gapEnd":-1}']))
        .then(endpoint1.send.bind(endpoint1, "vip-2", {type:"heartbeat",gapBegin:3,gapEnd:-1})) // To reduce double message only second request for gapEnd: -1 is respond
        .then(capture1.assertLog.bind(capture1, ['from vip-2: {"type":"message","messageNumber":3,"message":"message-4"}',
                                                 'from vip-2: {"type":"message","messageNumber":4,"message":"message-5"}']))
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: Double message sent", function(assert){
        Log.info("test", "[Reliable Hub]: Double message sent");
        var done = assert.async(1);

        var inBrowserHub = new VNF.InBrowserHub();
        var reliableHub = new VNF.ReliableHub(inBrowserHub);

        var endpoint1 = inBrowserHub.openEndpoint("vip-1");
        var endpoint2 =  reliableHub.openEndpoint("vip-2");

        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");


        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        endpoint1.send("vip-2", {"type":"message","messageNumber":0,"message":"message-1"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":1,"message":"message-2"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":1,"message":"message-2"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":2,"message":"message-3"});

        capture2.assertLog(['from vip-1: message-1',
                            'from vip-1: message-2',
                            'from vip-1: message-3',])
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: Wrong message order", function(assert){
        Log.info("test", "[Reliable Hub]: Simulating wrong sent message order");
        var done = assert.async(1);

        var inBrowserHub = new VNF.InBrowserHub();
        var reliableHub = new VNF.ReliableHub(inBrowserHub);

        var endpoint1 = inBrowserHub.openEndpoint("vip-1");
        var endpoint2 =  reliableHub.openEndpoint("vip-2");

        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");
        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        endpoint1.send("vip-2", {"type":"message","messageNumber":0,"message":"message-1"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":4,"message":"message-5"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":3,"message":"message-4"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":1,"message":"message-2"});
        endpoint1.send("vip-2", {"type":"message","messageNumber":2,"message":"message-3"});

        capture2.assertLog(['from vip-1: message-1',
                            'from vip-1: message-2',
                            'from vip-1: message-3',
                            'from vip-1: message-4',
                            'from vip-1: message-5'])
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: RTC heartbeat to invalidate - verify invalidate after 3 heartbeats", function(assert){
        Log.info("test", "[Reliable Hub]: RTC heartbeat to invalidate - verify invalidate after 3 heartbeats");

        var done = assert.async(1);

        var inBrowserHub = new VNF.InBrowserHub();
        var reliableHub = new VNF.ReliableHub(inBrowserHub, {heartbeatsToInvalidate: 3});

        var endpoint1 = inBrowserHub.openEndpoint("vip-1");
        var endpoint2 =  reliableHub.openEndpoint("vip-2");

        var endpoint2InBrowser =  inBrowserHub.openEndpoint("vip-2");

        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");
        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

        endpoint2InBrowser.invalidate = newPrintInvalidateCallback("vip-2");

        var capture1 = Log.captureLogs(assert, ["vip-1", "invalidate-vip-2"], ["message-test-handler", "endpoint-invalidate"]);
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        endpoint1.send("vip-2", {"type":"message","messageNumber":0,"message":"message-1"});

        capture2.assertLog(['from vip-1: message-1'])
        .then(capture1.assertLog.bind(null, ['from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":-1}',
                                             'from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":-1}',
                                             'from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":-1}',
                                             'invalidate called: vip-2 -> vip-1']))
        .then(endpoint1.destroy)
        .then(endpoint2.destroy)
        .then(done);
    });

    QUnit.test("[Reliable Hub]: RTC heartbeat to invalidate - verify no invalidate in case heartbeats delivered", function(assert){
        Log.info("test", "[Reliable Hub]: RTC heartbeat to invalidate - verify no invalidate in case heartbeats delivered");

        var done = assert.async(1);

        var inBrowserHub = new VNF.InBrowserHub();
        var reliableHub = new VNF.ReliableHub(inBrowserHub, {heartbeatsToInvalidate: 4});

        var endpoint1 = inBrowserHub.openEndpoint("vip-1");
        var endpoint2 =  reliableHub.openEndpoint("vip-2");

        var endpoint2InBrowser =  inBrowserHub.openEndpoint("vip-2");

        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");
        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

        endpoint2InBrowser.invalidate = newPrintInvalidateCallback("vip-2");

        var capture1 = Log.captureLogs(assert, ["vip-1", "invalidate-vip-2"], ["message-test-handler", "endpoint-invalidate"]);
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        endpoint1.send("vip-2", {"type":"message","messageNumber":0,"message":"message-1"});

        capture2.assertLog(['from vip-1: message-1'])
        .then(capture1.assertLog.bind(null, ['from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":-1}']))
        .then(endpoint1.send.bind(null, "vip-2", {"type":"heartbeat","gapBegin":0,"gapEnd":-1}))

        .then(capture1.assertLog.bind(null, ['from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":-1}']))
        .then(endpoint1.send.bind(null, "vip-2", {"type":"heartbeat","gapBegin":0,"gapEnd":-1}))

        .then(capture1.assertLog.bind(null, ['from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":-1}',
                                             'from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":-1}',
                                             'from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":-1}',
                                             'from vip-2: {"type":"heartbeat","gapBegin":1,"gapEnd":-1}',
                                             'invalidate called: vip-2 -> vip-1']))
        .then(endpoint1.destroy)
        .then(endpoint2.destroy)
        .then(done);

        //1) assert message
        //2) assert hearbeat 1
        //3) send heartbeat-response 1
        //4) assert hearbeat 2
        //5) send heartbeat-response 2
        //6) assert 3 hearbeats + invalidate
    });



    QUnit.test("[Reliable Hub]: Testing of Redelivering Lost Messages - Middle", function(assert){
        Log.info("test", "[Reliable Hub]: Testing of Redelivering Lost Messages - Middle");

        var done = assert.async(1);

        var unreliableHub = new VNF.UnreliableHub(new VNF.InBrowserHub());
        var reliableHub = new VNF.ReliableHub(unreliableHub);

        var endpoint1 = reliableHub.openEndpoint("vip-1");
        var endpoint2 = reliableHub.openEndpoint("vip-2");

        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error");
        unreliableHub.unblockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-2");

        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        capture2.assertLog(["from vip-1: vip-1-to-vip-2-message-delivered-1",
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

        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered-1");
        unreliableHub.blockChannel("vip-1", "vip-2");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error-1");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error-2");
        unreliableHub.unblockChannel("vip-1", "vip-2");

        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        capture2.assertLog(["from vip-1: vip-1-to-vip-2-message-delivered-1",
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

        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

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

        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        capture2.assertLog(["from vip-1: vip-1-to-vip-2-message-1",
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

    QUnit.test("[Reliable Hub]: RTC Connection restore test", function(assert){
        Log.info("test", "[Reliable Hub]: RTC Connection restore test");

        var done = assert.async(1);

        var rtcHub = new VNF.RTCHub(new VNF.InBrowserHub(), {heartbeatsToInvalidate: 3000});
        var reliableHub = new VNF.ReliableHub(rtcHub);

        var endpoint1 = reliableHub.openEndpoint("vip-1");
        var endpoint2 = reliableHub.openEndpoint("vip-2");

        var rtcEndpoint1 = rtcHub.openEndpoint("vip-1");
        var rtcEndpoint2 = rtcHub.openEndpoint("vip-2");

        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        endpoint1.send("vip-2", "rtc-message-1");
        endpoint1.send("vip-2", "rtc-message-2");
        endpoint1.send("vip-2", "rtc-message-3");

        capture2.assertLog(["from vip-1: rtc-message-1",
                            "from vip-1: rtc-message-2",
                            "from vip-1: rtc-message-3"])

        .then(function(){  rtcEndpoint1.getRTCConnection("vip-2").close(); })

        .then(endpoint1.send.bind(null, "vip-2", "[rtc1-close]rtc-message-4"))
        .then(endpoint1.send.bind(null, "vip-2", "[rtc1-close]rtc-message-5"))

        .then(capture2.assertLog.bind(null, ["from vip-1: [rtc1-close]rtc-message-4",
                                             "from vip-1: [rtc1-close]rtc-message-5"]))

        .then(function(){ rtcEndpoint2.getRTCConnection("vip-1").close(); })

        .then(endpoint1.send.bind(null, "vip-2", "[rtc2-close]rtc-message-6"))
        .then(endpoint1.send.bind(null, "vip-2", "[rtc2-close]rtc-message-7"))

        .then(capture2.assertLog.bind(null, ["from vip-1: [rtc2-close]rtc-message-6",
                                             "from vip-1: [rtc2-close]rtc-message-7"]))

        .then(endpoint1.destroy)
        .then(endpoint2.destroy)
        .then(done);

    });



    /*var unreliableHub = new VNF.UnreliableHub(new VNF.InBrowserHub());
    var reliableHub = new VNF.ReliableHub(unreliableHub);

    var endpoint1 = reliableHub.openEndpoint("vip-1");
    var endpoint2 = reliableHub.openEndpoint("vip-2");

    endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

    function sendToEndpoint2() {
        endpoint1.send("vip-2", "stress-message");

        window.setTimeout(sendToEndpoint2, 1);
    }

    sendToEndpoint2()*/
});