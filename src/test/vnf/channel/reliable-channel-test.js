requirejs(["vnf/vnf",
           "utils/capture-logs",
           "test/vnf-test-utils"],
function(  VNF,
           Log,
           VNFTestUtils){

    //TODO: message queue
    //TODO: message lost
    //TODO: multiple channel - WebRTC vs WebSocket
    //TODO: generic channel support

    QUnit.test("[Unreliable Hub]: Testing Unreliable hub", function(assert){
        Log.info("test", "[Reliable Hub]: Test message lost");

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

    /*QUnit.test("[Reliable Hub]: Testing Redelivering Lost Messages", function(assert){
        Log.info("test", "[Reliable Hub]: Test message lost");

        var done = assert.async(1);

        //var reliableHub = new VNF.ReliableHub({
        //    vnfHub: ...
        //});

        var unreliableHub = new VNF.UnreliableHub(new VNF.InBrowserHub());
        //var vnfHub    = new VNF.RTCHub(new VNF.InBrowserHub());
        

        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");

        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

        endpoint1.send("vip-2", "vip-1-to-vip-2-message-delivered");
        endpoint1.send("vip-2", "vip-1-to-vip-2-message-error");

        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

        capture2.assertLogUnordered(["from vip-1: vip-1-to-vip-2-message-delivered"])
         .then(capture2.assertSilence.bind(null, 100))
        .then(done);
    });*/
});