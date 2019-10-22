import {Log}      from "../../utils/logger.js";
import {xTimeout} from "../../utils/xtimeout.js";

import {Global}   from "../global.js";
import {ProxyHub} from "./base/vnf-proxy-hub.js";

window.vnfRtcServers = undefined;

/*window.vnfRtcServers = {
    iceServers: [
        //{url: "stun:23.21.150.121"},
        //{url: "stun:stun.1.google.com:19302"},
        {urls: "stun:127.0.0.1"}
    ]
};*/


var PACKET_CHUNK_LENGTH = 64*1024;

function printStatuses(connection){
    return JSON.stringify({
        signalingState:     connection.signalingState,
        iceConnectionState: connection.iceConnectionState,
        iceGatheringState:  connection.iceGatheringState
    });
}

function logErrorCallback(instanceId){
    var stacktrace = Error().stack;
    return function logError(e) {
        window.RtcDebugLastError = e;
        Log.error(instanceId, "webrtc-logerror", e + " see RtcDebugLastError for details\n" + stacktrace);
    }

}

function logSuccess(e){}

var connectionNextId = 0;

function VnfRtcConnection(connectionId){

    var RTCPeerConnection     = window.RTCPeerConnection     || window.mozRTCPeerConnection     || window.webkitRTCPeerConnection;
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
    var RTCIceCandidate       = window.RTCIceCandidate       || window.mozRTCIceCandidate       || window.webkitRTCIceCandidate;


    var self = this;
    var instanceId = "rtc[connection-" + connectionId + "]";

    var connection = null;
    var channel = null;

    var ice = null;

    var destroyed = false;

    var onIceCandidatesCallback = null;

    var onChannelOpenedCallback = null;
    var onChannelMessageCallback = null;
    var onChannelClosedCallback = null;

    self.createDate = new Date().getTime();

    self.startCaller = function(callback) {
        Log.verbose(instanceId, "webrtc-connecting", "startCaller");

        self.isCaller = true;
        onIceCandidatesCallback = callback;

        createRtcConnection();

        handleNewChannel(connection.createDataChannel("data"));

        connection.createOffer(onGotDescription, logErrorCallback(instanceId));
    }

    self.startCallee = function(ice, callback) {
        Log.verbose(instanceId, "webrtc-connecting", "startCallee: " + JSON.stringify(ice));

        self.isCaller = false;
        onIceCandidatesCallback = callback;

        createRtcConnection();

        connection.setRemoteDescription(new RTCSessionDescription(ice.sdp), logSuccess, logErrorCallback(instanceId));

        connection.createAnswer(function(desc){
            for(var i = 0; i < ice.candidate.length; i++) {
                connection.addIceCandidate(new RTCIceCandidate(ice.candidate[i]));
            }

            onGotDescription(desc);
        }, logErrorCallback(instanceId));

        connection.ondatachannel = function(evt){
            Log.verbose(instanceId, "webrtc-connecting", "ondatachannel: " + JSON.stringify(evt));
            handleNewChannel(evt.channel);
        }
    }

    self.acceptCalleeResponse = function(ice) {
        Log.verbose(instanceId, "webrtc-connecting", "acceptCalleeResponse: " + JSON.stringify(ice));

        connection.setRemoteDescription(new RTCSessionDescription(ice.sdp), logSuccess, logErrorCallback(instanceId));

        for(var i = 0; i < ice.candidate.length; i++) {
            connection.addIceCandidate(new RTCIceCandidate(ice.candidate[i]));
        }
    }

    self.send = function(message) {
        channel.send(message);
    }

    self.getRtcConnection = function() {
        return connection;
    }

    self.destroy = function() {
        destroyed = true;

        if(channel) {
            channel.onopen = function(){};
            channel.onmessage = function(){};
            channel.onclose = function(){};
        }

        if(connection) {
            connection.ondatachannel = function(){};
            connection.onsignalingstatechange = function(){};
            connection.onconnectionstatechange = function(){};
            connection.oniceconnectionstatechange = function(){};
        }

        // closing rtc connection will increase sending signal to other side to 5 seconds.
        if(connection) window.setTimeout(destroyRtcConnection, 1000);
        try{
            if(channel) {
                channel.close();
                channel = null;
            }
        }catch(e) {
            Log.debug(instanceId, "web-rtc", ["Unable to destroy Rtc connection", e]);
        }

        function destroyRtcConnection() {
            try{
                if(connection) connection.close();
                connection = null;
            }catch(e) {
                Log.debug(instanceId, "web-rtc", ["Unable to destroy Rtc connection", e]);
            }
        }
    }

    self.onChannelOpened = function(callback) {
        onChannelOpenedCallback = callback;
    }

    self.onChannelMessage = function(callback) {
        onChannelMessageCallback = callback;
    }

    self.onChannelClosed = function(callback) {
        onChannelClosedCallback = callback;
    }


    function handleNewChannel(channelArgument) {
        Log.verbose(instanceId, "webrtc-connecting", "onChannelCreated: " + channelArgument);
        channel = channelArgument;

        channel.onopen = function(event) {
            Log.verbose(instanceId, "webrtc-connecting", "onChannelOpened: " + event);

            if(onChannelOpenedCallback) {
                onChannelOpenedCallback();
            }
        }

        channel.onmessage = function(e) {
            try{
                onChannelMessageCallback(e.data);
            }catch(e) {
                Log.error(instanceId, "webrtc-onmessage", ["Error in onmessage handler", e]);
            }
        }

        channel.onclose = function(evt) {
            Log.verbose(instanceId, "webrtc-onclose", "\n" + printStatuses(evt.target));
            if(!destroyed) {
                self.destroy();
                onChannelClosedCallback();
            }
        }

        if(channel.readyState == "open" && onChannelOpenedCallback) {
            onChannelOpenedCallback();
        }
    }

    function createRtcConnection() {
        connection = new RTCPeerConnection(vnfRtcServers);

        ice = {candidate: []};

        var sendCandidates = xTimeout(Timeouts.iceSendTimeout, function sendCandidates() {
            if(destroyed) return;
            Log.verbose(instanceId, "webrtc-ice-gathered", "\n" + JSON.stringify(ice));
            onIceCandidatesCallback(ice);
        });

        connection.onsignalingstatechange = function(evt){
            Log.verbose(instanceId, "webrtc-onsignalingstatechange", "\n" + printStatuses(evt.target));

        };

        connection.onconnectionstatechange = function(evt) {
            Log.verbose(instanceId, "webrtc-onconnectionstatechange", "\n" + printStatuses(evt.target) + ", destroyed: " + destroyed);
        }

        connection.oniceconnectionstatechange = function(evt){
            Log.verbose(instanceId, "webrtc-oniceconnectionstatechange", "\n" + printStatuses(evt.target) + ", destroyed: " + destroyed);
            if(evt.target.iceConnectionState == "disconnected" && !destroyed) {
                destroyed = true;
                onChannelClosedCallback();
            }
        };

        connection.onicecandidate = function(evt){
            Log.verbose(instanceId, "webrtc-connecting", "onicecandidate: " + JSON.stringify(evt.candidate));

            if(evt.candidate != null) ice.candidate.push(evt.candidate);

            sendCandidates.extend(Timeouts.iceSendTimeout);

            if(evt.candidate == null) {
                sendCandidates.trigger()
            }
        }
    }

    function onGotDescription(desc) {
        Log.verbose(instanceId, "webrtc-connecting", "onGotDescription: " + JSON.stringify(desc));

        connection.setLocalDescription(desc);
        ice.sdp = desc;
    }
}

export function RtcHub(signalingHub){
    var selfHub = this;
    ProxyHub.call(selfHub, signalingHub);

    selfHub.setEstablishConnectionTimeout(1500);

    selfHub.VnfEndpoint = function RTCEndpoint(selfVip) {
        var self = this;
        selfHub.ProxyEndpoint.call(self, selfVip);

        var signalingEndpoint = self.parentEndpoint;

        function createVnfRtcConnection(connection) {
            var connectionIndex = connectionNextId++;
            var vnfRtcConnection = new VnfRtcConnection(connectionIndex + ": " + selfVip + "->" + connection.targetVip )

            vnfRtcConnection.onChannelOpened(function() {
                if(self.isDestroyed()) {
                    vnfRtcConnection.destroy();

                    return;
                }

                self.__connectionOpened(connection);
            });

            vnfRtcConnection.onChannelMessage(function(message) {
                if(!connection.isConnected || connection.isDestroyed) {
                    return;
                }

                try {
                    self.onMessage && self.onMessage({
                        message: message,
                        sourceVip: connection.targetVip,
                        endpoint:  self
                    });
                }catch(e) {
                    Log.error("rtc[" + selfVip + "->" + event.sourceVip + "]", "web-rtc", ["Error in onMessage handler ", e]);
                }
            })

            vnfRtcConnection.onChannelClosed(function vnfChannelClosedCallback(){
                self.__rejectConnection(connection);
            });

            return vnfRtcConnection;
        }

        signalingEndpoint.onMessage = function(event) {
            var message = JSON.parse(event.message);
            if(message.type == "rtc-connection") {
                Log.verbose("rtc[" + selfVip + "->" + event.sourceVip + "]", "webrtc-connecting", "handling-signal-message: " + JSON.stringify(event));

                var targetVip = event.sourceVip;

                var connection = self.__lazyNewConnection(targetVip);
                var existentVnfRtcConnection = connection.vnfRtcConnection;

                if(message.requestForNewConnection) {
                    if(existentVnfRtcConnection && existentVnfRtcConnection.isCaller && message.connectionCreateDate < existentVnfRtcConnection.createDate) {
                        Log.verbose("rtc[" + selfVip + "->...]", "webrtc-connecting", "ignore-action/connection-expired:" + JSON.stringify(event));
                        return;
                    }

                    connection.vnfRtcConnection = createVnfRtcConnection(connection);
                    connection.vnfRtcConnection.startCallee(message.ice, function(ice){
                        var message =  {type: "rtc-connection",
                                        requestForNewConnection: false,
                                        ice: ice,
                                        connectionCreateDate: connection.vnfRtcConnection.createDate};

                        try{
                            signalingEndpoint.send(connection.targetVip, JSON.stringify(message));
                        }catch(e) {
                            Log.debug("rtc[" + selfVip + "]", "web-rtc", ["Unable to send accept message via signaling endpoint", e]);
                        }
                    });

                    if(existentVnfRtcConnection) {
                        existentVnfRtcConnection.destroy();
                    }
                }else{
                    if(existentVnfRtcConnection.isCaller) {
                        existentVnfRtcConnection.acceptCalleeResponse(message.ice);
                    }
                }
           }
        }

        self.__doOpenConnection_NextTry = function(connection) {
            signalingEndpoint.openConnection(connection.targetVip, function(event) {
                if(connection.isConnected || connection.isDestroyed) {
                    return;
                }

                if(event.status  == Global.FAILED) {
                    self.__connectionNextTryFailed(connection);
                    return;
                }

                connection.vnfRtcConnection = createVnfRtcConnection(connection);
                connection.vnfRtcConnection.startCaller(function(ice){

                    var message =  {type: "rtc-connection",
                                    requestForNewConnection: true,
                                    ice: ice,
                                    connectionCreateDate: connection.vnfRtcConnection.createDate};
                    try {
                        signalingEndpoint.send(connection.targetVip, JSON.stringify(message));
                    }catch(e) {
                        Log.debug("rtc[" + selfVip + "]", "web-rtc", ["Unable to send handshake message via signaling endpoint", e]);
                    }
                });
            })
        }

        self.__doOpenConnection_CleanBeforeNextTry = function(connection) {
            if(connection.vnfRtcConnection) {
                connection.vnfRtcConnection.destroy();
            }
        }

        var __superDoReleaseConnection = self.__doReleaseConnection;
        self.__doReleaseConnection = function(connection) {
            self.__doOpenConnection_CleanBeforeNextTry(connection);

            __superDoReleaseConnection(connection);
        }

        self.getRtcConnection = function(vip) {
            return self.getConnection(vip).vnfRtcConnection.getRtcConnection();
        }

        self.__doSend = function(connection, message) {
            try{
                connection.vnfRtcConnection.send(message);
            }catch(e) {
                if(!connection.isConnected && !connection.isDestroyed()) {
                    Log.debug("rtc[" + selfVip + "]", "web-rtc", ["Unable to send message via RTC"]);
                }

                Log.debug("rtc[" + selfVip + "]", "web-rtc", ["Unable to send message via RTC", e]);
           }
        }
    };
};

