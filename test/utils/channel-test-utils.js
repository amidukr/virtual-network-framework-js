import {Log}         from "../../src/utils/logger.js";
import {SignalCaptor} from "../../src/utils/signal-captor.js";
import {Random} from "../../src/utils/random.js";

import {VnfTestUtils} from "./vnf-test-utils.js";

import {Vnf} from "../../src/vnf/vnf.js";


function inBrowserFactory(){
    return new Vnf.InBrowserHub();
}

function reliableRtcWebSocketFactory(){
    return new Vnf.ReliableRtcHub(webSocketFactory())
}

function rtcFactory(){
    return new Vnf.RtcHub(new Vnf.InBrowserHub())
}

function bigMessageFactory(){
    return new Vnf.MarshallerHub(new Vnf.InBrowserHub());
}

function reliableWebSocketFactory() {
    return new Vnf.ReliableHub(webSocketFactory());
}

function webSocketFactory() {
    var hub = new Vnf.WebSocketHub(new Vnf.WebSocketFactory(TestingProfiles.vnfWebSocketUrl));

    hub.setEstablishConnectionTimeout(1500);
    hub.setRetryConnectAfterDelay(400);
    hub.setOpenConnectionRetries(10);

    hub.setRpcBusyTimerInterval(1000);
    hub.setRpcIdleTimerInterval(1000);
    hub.setRpcLoginRecreateInterval(3000);

    return hub;
}

function reliableFactory() {
    return new Vnf.ReliableHub(new Vnf.InBrowserHub());
}

function unreliableFactory() {
    return new Vnf.UnreliableHub(new Vnf.InBrowserHub());
}

function reliableRtcFactory() {
    return new Vnf.MarshallerHub(new Vnf.ReliableRtcHub(new Vnf.InBrowserHub()));
}


function integrationChannelTest(channelName, description, callback) {
    VnfTestUtils.test(["Channel Integration Tests", channelName], description,    {hubFactory: ChannelTestUtils.hubFactories[channelName]}, function(assert, args){
        args.vnfHub = args.hubFactory();
        args.channelName = channelName;
        args.recipientEva = Random.random6() + "-recipient";
        args.senderEva = Random.random6() + "-sender";
        args.endpointRecipient = args.vnfHub.openEndpoint(args.recipientEva);
        args.endpointSender = args.vnfHub.openEndpoint(args.senderEva);

        args.recipientCaptor = new SignalCaptor(assert);
        args.senderCaptor    = new SignalCaptor(assert);

        args.endpointRecipient.onMessage = VnfTestUtils.newPrintCallback(args.recipientCaptor, "recipient");
        args.endpointSender.onMessage    = VnfTestUtils.newPrintCallback(args.senderCaptor, "sender");

        VnfTestUtils.onTearDown(function(){
            args.endpointRecipient.destroy();
            args.endpointSender.destroy();
        });

        callback(assert, args);
    });
}

export class ChannelTestUtils {

    static integrationTest(description, callback) {
       // Main cases
       integrationChannelTest("InBrowser",              description, callback);
       integrationChannelTest("Reliable Rtc WebSocket", description, callback);

       // Misc
       integrationChannelTest("Rtc",                 description, callback);
       integrationChannelTest("Big Message Factory", description, callback);
       integrationChannelTest("WebSocket",           description, callback);
       integrationChannelTest("Reliable",            description, callback);
       integrationChannelTest("Unreliable",          description, callback);

       // ReliableRtc
       integrationChannelTest("Reliable Rtc", description, callback);
   }
}

ChannelTestUtils.hubFactories = {
     // Main cases
     "InBrowser":              inBrowserFactory,
     "Reliable Rtc WebSocket": reliableRtcWebSocketFactory,

     // Misc
     "Rtc":                    rtcFactory,
     "Big Message Factory":    bigMessageFactory,
     "WebSocket":              webSocketFactory,
     "Reliable":               reliableFactory,
     "Unreliable":             unreliableFactory,

     // ReliableRtc
     "Reliable Rtc": reliableRtcFactory
}