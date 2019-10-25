import {ReplayProxy} from "../utils/replay-proxy.js";
import {Log, DEBUG, WARN} from "../../src/utils/logger.js";

Log.setDefaultLogLevel(DEBUG);

Error.stackTraceLimit = Infinity;

ReplayProxy.installQUnitHooks();
ReplayProxy.installWebSocketProxy();
ReplayProxy.installRtcProxy();


window.Timeouts = {}
window.TestingProfiles = {}

TestingProfiles = {
    vnfWebSocketUrl: "wss://aqueous-crag-1991.herokuapp.com/webbroker/vnf-ws",
}

Timeouts.logCaptureTimeout = 27000;
QUnit.config.testTimeout   = 28000;


ReplayProxy.startNewReplay();
new WebSocket(TestingProfiles.vnfWebSocketUrl);
ReplayProxy.deleteReplay();
