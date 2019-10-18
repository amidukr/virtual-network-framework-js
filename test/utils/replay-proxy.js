import {Log} from "../../src/utils/logger.js";

import {ReplayWriter} from "./replay-proxy/proxy-replay.js";
import {webSocketProxyTypeFactory} from "./replay-proxy/websocket-replay-proxy.js";
import {rtcPeerConnectionProxyTypeFactory} from "./replay-proxy/rtc-replay-proxy.js";


export {ReplayWriter, webSocketProxyTypeFactory};

var replay;

export class ReplayProxy {

    static installWebSocketProxy() {
        var nativeWebSocket = window.WebSocket;
        window.WebSocket = webSocketProxyTypeFactory(nativeWebSocket);
    }

    static installRtcProxy() {
        var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

        window.RTCPeerConnection = rtcPeerConnectionProxyTypeFactory(RTCPeerConnection);
        window.mozRTCPeerConnection = window.RTCPeerConnection;
        window.webkitRTCPeerConnection = window.RTCPeerConnection;
    }

    static installQUnitHooks() {
        QUnit.testStart(() => {
            ReplayProxy.startNewReplay();
        });

        QUnit.testDone((details) => {
            if(details.failed > 0) {
                var dump = ReplayProxy.getCurrentReplay().dump();
                var dumpString = JSON.stringify(dump);
                var detailsString = JSON.stringify(details);
                Log.error('proxy-replay', `Test: ${details.name} failed:\n${detailsString}\n  replay:\n${dumpString}`);
            }

            ReplayProxy.deleteReplay();
        });
    }

    static startNewReplay() {
        replay = new ReplayWriter();
    }

    static deleteReplay() {
        replay = null;
    }

    static getCurrentReplay() {
        if(!replay) throw new Error("No replay started");

        return replay;
    }
}



