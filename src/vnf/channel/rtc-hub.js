define(["utils/logger", "utils/xtimeout", "vnf/channel/base/vnf-proxy-hub", "vnf/global"], function(Log, xTimeout, ProxyHub, Global) {

    var RTCPeerConnection     = window.RTCPeerConnection     || window.mozRTCPeerConnection     || window.webkitRTCPeerConnection;
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
    var RTCIceCandidate       = window.RTCIceCandidate       || window.mozRTCIceCandidate       || window.webkitRTCIceCandidate;

    window.vnfRtcServers = {
        iceServers: [
            //{url: "stun:23.21.150.121"},
            //{url: "stun:stun.1.google.com:19302"},
            {urls: "stun:127.0.0.1"}
        ]
    };
    

    var PACKET_CHUNK_LENGTH = 64*1024;

    function printStatuses(connection){
        return JSON.stringify({
            signalingState:     connection.signalingState,
            iceConnectionState: connection.iceConnectionState,
            iceGatheringState:  connection.iceGatheringState
        });
    }

    function logErrorCallback(instanceId){
        var stacktrace = new Error();
        return function(e) {
            window.RtcDebugLastError = e;
            Log.error(instanceId, "webrtc-logerror", e + " see RtcDebugLastError for details");
            console.error(stacktrace);
        }
        
    }

    function logSuccess(e){}

    var connectionNextId = 0;

    function VnfRtcConnection(connectionId){

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
            Log.debug(instanceId, "webrtc-connecting", "startCaller");

            self.isCaller = true;
            onIceCandidatesCallback = callback;

            createRtcConnection();

            handleNewChannel(connection.createDataChannel("data"));

            connection.createOffer(onGotDescription, logErrorCallback(instanceId));
        }

        self.startCallee = function(ice, callback) {
            Log.debug(instanceId, "webrtc-connecting", "startCallee: " + JSON.stringify(ice));

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
                Log.debug(instanceId, "webrtc-connecting", "ondatachannel: " + JSON.stringify(evt));
                handleNewChannel(evt.channel);
            }
        }

        self.acceptCalleeResponse = function(ice) {
            Log.debug(instanceId, "webrtc-connecting", "acceptCalleeResponse: " + JSON.stringify(ice));

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

            try{
                connection.close();
            }catch(e) {
                Log.warn(instanceId, "web-rtc", ["Unable to destroy Rtc endpoint", e]);
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
            Log.debug(instanceId, "webrtc-connecting", "onChannelCreated: " + channelArgument);
            channel = channelArgument;

            channel.onopen = function(event) {
                Log.debug(instanceId, "webrtc-connecting", "onChannelOpened: " + event);

                if(onChannelOpenedCallback) {
                    onChannelOpenedCallback();
                }
            }

            channel.onmessage = function(e) {
                onChannelMessageCallback(e.data);
            }

            channel.onclose = function(evt) {
                Log.debug(instanceId, "webrtc-onclose", "\n" + printStatuses(evt.target));
                if(!destroyed) {
                    destroyed = true;
                    onChannelClosedCallback();
                }
            }
        }


        function createRtcConnection() {
            connection = new RTCPeerConnection(vnfRtcServers);

            ice = {candidate: []};

            var sendCandidates = xTimeout(Timeouts.iceSendTimeout, function sendCandidates() {
                if(destroyed) return;
                Log.debug(instanceId, "webrtc-ice-gathered", "\n" + JSON.stringify(ice));
                onIceCandidatesCallback(ice);
            });

            connection.onsignalingstatechange = function(evt){
                Log.debug(instanceId, "webrtc-onsignalingstatechange", "\n" + printStatuses(evt.target));

            };

            connection.oniceconnectionstatechange = function(evt){
                Log.debug(instanceId, "webrtc-oniceconnectionstatechange", "\n" + printStatuses(evt.target) + ", destroyed: " + destroyed);
                if(evt.target.iceConnectionState == "disconnected" && !destroyed) {
                    destroyed = true;
                    onChannelClosedCallback();
                }
            };

            connection.onicecandidate = function(evt){
                Log.debug(instanceId, "webrtc-connecting", "onicecandidate: " + JSON.stringify(evt.candidate));

                if(evt.candidate != null) ice.candidate.push(evt.candidate);

                sendCandidates.extend(Timeouts.iceSendTimeout);

                if(evt.candidate == null) {
                    sendCandidates.trigger()
                }
            }
        }

        function onGotDescription(desc) {
            Log.debug(instanceId, "webrtc-connecting", "onGotDescription: " + JSON.stringify(desc));

            connection.setLocalDescription(desc);
            ice.sdp = desc;
        }
    }

    return function RtcHub(signalingHub){
        var selfHub = this;
        ProxyHub.call(selfHub, signalingHub);

        var establishConnectionTimeout = 10000;
        selfHub.setEstablishConnectionTimeout = function(value) {
            establishConnectionTimeout = value;
        }

        selfHub.VnfEndpoint = function RTCEndpoint(selfVip) {
            var self = this;
            selfHub.ProxyEndpoint.call(self, selfVip);

            var signalingEndpoint = self.parentEndpoint;

            function createVnfRtcConnection(targetVip) {
                var connectionIndex = connectionNextId++;
                var vnfRtcConnection = new VnfRtcConnection(connectionIndex + ": " + selfVip + "->" + targetVip )

                vnfRtcConnection.onChannelOpened(function() {
                    if(self.isDestroyed()) {
                        vnfRtcConnection.destroy();

                        return;
                    }

                    var connection = self.getConnection(targetVip);

                    window.clearTimeout(connection.connectTimeoutHandler);

                    self.__connectionOpened(targetVip);
                });

                vnfRtcConnection.onChannelMessage(function(message) {
                    var onMessage = self.onMessage;
                    if(onMessage) {
                        self.onMessage({message: message,
                                        sourceVip: targetVip,
                                        endpoint:  self});
                    }
                })

                vnfRtcConnection.onChannelClosed(function(){
                    self.closeConnection(targetVip);
                });

                return vnfRtcConnection;
            }

            signalingEndpoint.onMessage = function(event) {
                var message = JSON.parse(event.message);
                if(message.type == "rtc-connection") {
                    Log.debug("rtc[" + selfVip + "->" + event.sourceVip + "]", "webrtc-connecting", "handling-signal-message: " + JSON.stringify(event));

                    var targetVip = event.sourceVip;

                    var connection = self.__lazyNewConnection(targetVip);
                    var existentVnfRtcConnection = connection.vnfRtcConnection;

                    if(message.requestForNewConnection) {
                        if(existentVnfRtcConnection && existentVnfRtcConnection.isCaller && message.connectionCreateDate < existentVnfRtcConnection.createDate) {
                            Log.debug("rtc[" + selfVip + "->...]", "webrtc-connecting", "ignore-action/connection-expired:" + JSON.stringify(event));
                            return;
                        }

                        connection.vnfRtcConnection = createVnfRtcConnection(targetVip);
                        connection.vnfRtcConnection.startCallee(message.ice, function(ice){
                            var message =  {type: "rtc-connection",
                                            requestForNewConnection: false,
                                            ice: ice,
                                            connectionCreateDate: connection.vnfRtcConnection.createDate};

                            signalingEndpoint.send(connection.targetVip, JSON.stringify(message));
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

            self.__doOpenConnection = function(connection) {
                function doRunOpenConnection() {
                    signalingEndpoint.openConnection(connection.targetVip, function(event) {
                        if(event.status  == Global.FAILED) {
                            self.__connectionOpenFailed(connection.targetVip);
                            return;
                        }

                        connection.vnfRtcConnection = createVnfRtcConnection(connection.targetVip);
                        connection.vnfRtcConnection.startCaller(function(ice){

                            var message =  {type: "rtc-connection",
                                            requestForNewConnection: true,
                                            ice: ice,
                                            connectionCreateDate: connection.vnfRtcConnection.createDate};

                            signalingEndpoint.send(connection.targetVip, JSON.stringify(message));
                        });
                    })
                }

                connection.connectTimeoutHandler = window.setTimeout(function(){
                    if(self.isConnected(connection.targetVip)) return;

                    self.__connectionOpenFailed(connection.targetVip);
                }, establishConnectionTimeout);

                window.setTimeout(doRunOpenConnection, 0);
            }

            self.getRtcConnection = function(vip) {
                return self.getConnection(vip).vnfRtcConnection.getRtcConnection();
            }

            self.__doSend = function(connection, message) {
               try{
                   connection.vnfRtcConnection.send(message);
               }catch(e) {
                   Log.warn("rtc[" + selfVip + "]", "web-rtc", ["Unable to send message via RTC", e]);
               }
            }

            var __superDoReleaseConnection = self.__doReleaseConnection;
            self.__doReleaseConnection = function(connection) {
                if(connection.vnfRtcConnection) {
                    connection.vnfRtcConnection.destroy();    
                }
                __superDoReleaseConnection(connection);
            }
        };
    };
});
