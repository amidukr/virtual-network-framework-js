import {ReplayProxy} from "../utils/replay-proxy.js";

Error.stackTraceLimit = Infinity;

ReplayProxy.installQUnitHooks();
ReplayProxy.installWebSocketProxy();
ReplayProxy.installRtcProxy();


window.Timeouts = {}
window.TestingProfiles = {}

TestingProfiles = {
    vnfWebSocketUrl: "wss://aqueous-crag-1991.herokuapp.com/webbroker/vnf-ws",
}

QUnit.config.testTimeout   = 27000;
Timeouts.logCaptureTimeout = 28000;

ReplayProxy.startNewReplay();
new WebSocket(TestingProfiles.vnfWebSocketUrl);
ReplayProxy.deleteReplay();
