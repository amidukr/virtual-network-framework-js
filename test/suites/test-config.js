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

QUnit.config.testTimeout   = 30000;
Timeouts.logCaptureTimeout = 30000;

ReplayProxy.startNewReplay();
new WebSocket(TestingProfiles.vnfWebSocketUrl);
ReplayProxy.deleteReplay();
