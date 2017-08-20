requirejs(["vnf/vnf",
           "utils/signal-captor",
           "utils/logger",
           "test/utils/vnf-test-utils"],
function(  Vnf,
           SignalCaptor,
           Log,
           VnfTestUtils){


    VnfTestUtils.test("Reliable-RTC", "Rtc Connection restore test", function(assert){
        var done = assert.async(1);

        var rtcHub = new Vnf.RtcHub(new Vnf.InBrowserHub(), {heartbeatsToInvalidate: 3000});
        var reliableHub = new Vnf.ReliableHub(rtcHub);

        var endpoint1 = reliableHub.openEndpoint("vip-1");
        var endpoint2 = reliableHub.openEndpoint("vip-2");

        var rtcEndpoint1 = rtcHub.openEndpoint("vip-1");
        var rtcEndpoint2 = rtcHub.openEndpoint("vip-2");

        var capture2 = new SignalCaptor(assert);
        endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "vip-2");


        endpoint1.send("vip-2", "rtc-message-1");
        endpoint1.send("vip-2", "rtc-message-2");
        endpoint1.send("vip-2", "rtc-message-3");

        capture2.assertSignals(["from vip-1: rtc-message-1",
                            "from vip-1: rtc-message-2",
                            "from vip-1: rtc-message-3"])

        .then(function(){  rtcEndpoint1.getRtcConnection("vip-2").close(); })

        .then(endpoint1.send.bind(null, "vip-2", "[rtc1-close]rtc-message-4"))
        .then(endpoint1.send.bind(null, "vip-2", "[rtc1-close]rtc-message-5"))

        .then(capture2.assertSignals.bind(null, ["from vip-1: [rtc1-close]rtc-message-4",
                                             "from vip-1: [rtc1-close]rtc-message-5"]))

        .then(function(){ rtcEndpoint2.getRtcConnection("vip-1").close(); })

        .then(endpoint1.send.bind(null, "vip-2", "[rtc2-close]rtc-message-6"))
        .then(endpoint1.send.bind(null, "vip-2", "[rtc2-close]rtc-message-7"))

        .then(capture2.assertSignals.bind(null, ["from vip-1: [rtc2-close]rtc-message-6",
                                             "from vip-1: [rtc2-close]rtc-message-7"]))

        .then(endpoint1.destroy)
        .then(endpoint2.destroy)
        .then(done);
    });
})