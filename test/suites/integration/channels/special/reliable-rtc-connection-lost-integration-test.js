import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";


QUnit.module("Reliable-RTC Connection Lost Tests")
VnfTestUtils.test("Reliable-RTC", "Rtc Connection restore test", function(assert){
    var done = assert.async(1);

    var rtcHub = new Vnf.RtcHub(new Vnf.InBrowserHub(), {heartbeatsToInvalidate: 3000});
    var reliableHub = new Vnf.ReliableHub(rtcHub);

    reliableHub.setHeartbeatInterval(50);
    reliableHub.setConnectionInvalidateInterval(300);
    reliableHub.setConnectionLostTimeout(600);

    var endpoint1 = reliableHub.openEndpoint("eva-1");
    var endpoint2 = reliableHub.openEndpoint("eva-2");

    var rtcEndpoint1 = rtcHub.openEndpoint("eva-1");
    var rtcEndpoint2 = rtcHub.openEndpoint("eva-2");

    var capture2 = new SignalCaptor(assert);
    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "eva-2");

    endpoint1.openConnection("eva-2", function(event){
        assert.equal(event.status,    "CONNECTED", "Verifying connection status");

        endpoint1.send("eva-2", "rtc-message-1");
        endpoint1.send("eva-2", "rtc-message-2");
        endpoint1.send("eva-2", "rtc-message-3");
    });

    capture2.assertSignals(["from eva-1: rtc-message-1",
                        "from eva-1: rtc-message-2",
                        "from eva-1: rtc-message-3"])

    .then(function(){  rtcEndpoint1.getRtcConnection("eva-2").close(); })

    .then(endpoint1.send.bind(null, "eva-2", "[rtc1-close]rtc-message-4"))
    .then(endpoint1.send.bind(null, "eva-2", "[rtc1-close]rtc-message-5"))

    .then(capture2.assertSignals.bind(null, ["from eva-1: [rtc1-close]rtc-message-4",
                                         "from eva-1: [rtc1-close]rtc-message-5"]))

    .then(function(){ rtcEndpoint2.getRtcConnection("eva-1").close(); })

    .then(endpoint1.send.bind(null, "eva-2", "[rtc2-close]rtc-message-6"))
    .then(endpoint1.send.bind(null, "eva-2", "[rtc2-close]rtc-message-7"))

    .then(capture2.assertSignals.bind(null, ["from eva-1: [rtc2-close]rtc-message-6",
                                         "from eva-1: [rtc2-close]rtc-message-7"]))

    .then(endpoint1.destroy)
    .then(endpoint2.destroy)
    .then(done);
});
