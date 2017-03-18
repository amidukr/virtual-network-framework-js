define(["utils/logger", "utils/xtimeout.js", "vnf/channel/base/vnf-proxy-hub"], function(Log, xTimeout, ProxyHub) {

    var RTCPeerConnection     = window.RTCPeerConnection     || window.mozRTCPeerConnection     || window.webkitRTCPeerConnection;
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
    var RTCIceCandidate       = window.RTCIceCandidate       || window.mozRTCIceCandidate       || window.webkitRTCIceCandidate;

    window.vnfRTCServers = {
        iceServers: [
            //{url: "stun:23.21.150.121"},
            //{url: "stun:stun.1.google.com:19302"}
            {url: "stun:127.0.0.1"}
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
            window.RTCDebugLastError = e;
            Log.error(instanceId, "webrtc-logerror", e + " see RTCDebugLastError for details");
            console.error(stacktrace);
        }
        
    }

    function logSuccess(e){}

    var connectionNextId = 0;

    function VNFRTCConnection(rtcEndpoint, targetVip, signalingEndpoint) {
        var connectionIndex = connectionNextId++;
        
        var self = this;
        var instanceId = "rtc[connection-" + connectionIndex + ": " + rtcEndpoint.vip + "->" + targetVip + "]";

        var connection = null;
        var channel = null;
        var ice = null;

        var messageFragment = null;
        var messageLen = null;
        var messageType = null;

        var destroyed = false;

        self.createDate = new Date().getTime();


        function onChannelCreated(channelArgument) {
            Log.debug(instanceId, "webrtc-connecting", "onChannelCreated: " + channelArgument);
            channel = channelArgument;

            channel.onopen = function(event) {
                Log.debug(instanceId, "webrtc-connecting", "onChannelOpened: " + event);

                self.channel = channel;
                self.isReady = true;

                if(rtcEndpoint.onChannelOpened) {
                    rtcEndpoint.onChannelOpened(targetVip, self);
                }
            }

            channel.onmessage = function(e) {
                var message = e.data;
                
                if(messageLen == null) {
                    // First fragment of new message
                    messageType = message.substr(0, 1);
                    var lenDigit = message.substr(1, 1) - 0;
                    messageLen = message.substr(2, lenDigit) - 0;

                    messageFragment = message.substr(2 + lenDigit);
                } else {
                    messageFragment += message;
                }

                if(messageFragment.length == messageLen) {
                    messageLen = null;

                    var message = messageType == "J" ? JSON.parse(messageFragment) : messageFragment;
                    
                    rtcEndpoint.onMessage({message: message,
                                          sourceVIP: targetVip,
                                          endpoint: rtcEndpoint});

                    messageFragment = null;
                    messageType = null;
                }
            }

            channel.onclose = function(evt) {
                Log.debug(instanceId, "webrtc-onclose", "\n" + printStatuses(evt.target));
                if(!destroyed) {
                    destroyed = true;
                    window.setTimeout(rtcEndpoint.closeConnection.bind(null, targetVip), 5);
                }
            }
        }

        function acceptIce(ice) {
            connection.setRemoteDescription(new RTCSessionDescription(ice.sdp), logSuccess, logErrorCallback(instanceId));

            for(var i = 0; i < ice.candidate.length; i++) {
                connection.addIceCandidate(new RTCIceCandidate(ice.candidate[i]));
            }
        }

        self.acceptCalleeResponse = function(event) {
            Log.debug(instanceId, "webrtc-connecting", "acceptCalleeResponse: " + JSON.stringify(event));

            var message = event.message;

            acceptIce(message.ice);
        }

        function createRTCConnection() {
            connection = new RTCPeerConnection(vnfRTCServers);

            ice = {candidate: []};
            self.isReady = false;

            var onIceCandidateTimeout = null;

            var sendCandidates = xTimeout(Timeouts.iceSendTimeout, function sendCandidates() {
                if(destroyed) return;
                
                var message =  {type: "rtc-connection", 
                                requestForNewConnection: self.isCaller, 
                                ice: ice,
                                connectionCreateDate: self.createDate};
                
                Log.debug(instanceId, "webrtc-connecting", "send-signal to " + targetVip + ": " + JSON.stringify(message));
                signalingEndpoint.send(targetVip, message);
            });

            connection.onsignalingstatechange = function(evt){
                Log.debug(instanceId, "webrtc-onsignalingstatechange", "\n" + printStatuses(evt.target));

            };

            connection.oniceconnectionstatechange = function(evt){
                Log.debug(instanceId, "webrtc-oniceconnectionstatechange", "\n" + printStatuses(evt.target) + ", destroyed: " + destroyed);
                if(evt.target.iceConnectionState == "disconnected" && !destroyed) {
                    destroyed = true;
                    rtcEndpoint.closeConnection(targetVip);
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

        self.getRTCConnection = function() {
            return connection;
        }

        function onGotDescription(desc) {
            Log.debug(instanceId, "webrtc-connecting", "onGotDescription: " + JSON.stringify(desc));

            connection.setLocalDescription(desc);
            ice.sdp = desc;
        }

        self.startCaller = function() {
            Log.debug(instanceId, "webrtc-connecting", "startCaller");
            self.isCaller = true;

            createRTCConnection();

            onChannelCreated(connection.createDataChannel("data"));

            connection.createOffer(onGotDescription, logErrorCallback(instanceId));
        }

        self.startCallee = function(message) {
            Log.debug(instanceId, "webrtc-connecting", "startCallee: " + JSON.stringify(message));
            self.isCaller = false;

            createRTCConnection();

            connection.setRemoteDescription(new RTCSessionDescription(message.ice.sdp), logSuccess, logErrorCallback(instanceId));

            connection.createAnswer(function(desc){
                for(var i = 0; i < message.ice.candidate.length; i++) {
                    connection.addIceCandidate(new RTCIceCandidate(message.ice.candidate[i]));
                }

                onGotDescription(desc);
            }, logErrorCallback(instanceId));

            connection.ondatachannel = function(evt){
                Log.debug(instanceId, "webrtc-connecting", "ondatachannel: " + JSON.stringify(evt));
                onChannelCreated(evt.channel);
            }
        }

        self.destroy = function() {
            destroyed = true;

            try{
                connection.close();
            }catch(e) {
                Log.warn(instanceId, "web-rtc", ["Unable to destroy RTC endpoint", e]);
            }
        }

        self.send = function(message) {
            var messageData;
            var messageType;

            if(typeof message == "string") {
                messageData = message; 
                messageType = "S";
            }else{
                messageData = JSON.stringify(message);
                messageType = "J";
            }

            var msgLen = messageData.length + "";
            var lenDigit = msgLen.length + "";
            if(lenDigit.length > 1) {
                throw new Error("Message length to big: " + msgLen);
            }

            var chunkLength = rtcEndpoint.chunkLength;
            var position = 0;

            while(position < msgLen) {
                var msgChunk = messageData.substr(position, chunkLength);
                var fragment = position == 0 ? messageType + lenDigit + msgLen +  msgChunk : msgChunk;
                channel.send(fragment);
                position += msgChunk.length;
            }
        }
    }

    return function RTCHub(signalingHub){
        var selfHub = this;
        ProxyHub.call(selfHub, signalingHub);

        selfHub.VNFEndpoint = function RTCEndpoint(selfVip) {
           var self = this;
           selfHub.ProxyEndpoint.call(self, selfVip);

           var signalingEndpoint = self.parentEndpoint;

           var connectionSet = {}
           var connectionMessageQueue = {}

           self.chunkLength = PACKET_CHUNK_LENGTH;

           signalingEndpoint.onMessage = function(event) {
               if(event.message.type == "rtc-connection") {
                    Log.debug("rtc[" + selfVip + "->...]", "webrtc-connecting", "handling-signal-message: " + JSON.stringify(event));

                    var targetVip = event.sourceVIP;
                    var message = event.message;

                    if(event.message.requestForNewConnection) {
                        if(connectionSet[targetVip] && event.message.connectionCreateDate < connectionSet[targetVip].createDate) {
                            Log.debug("rtc[" + selfVip + "->...]", "webrtc-connecting", "ignore-action/connection-expired:" + JSON.stringify(event));
                            return;
                        }

                        connectionSet[targetVip] = new VNFRTCConnection(self, targetVip, signalingEndpoint);
                        connectionSet[targetVip].startCallee(message);
                    }else{
                        connectionSet[targetVip].acceptCalleeResponse(event);
                    }
               }
           }

           self.onChannelOpened = function(targetVip, connection) {
               if(self.isDestroyed()) {
                   connection.destroy();

                   return;
               }

               Log.debug("rtc[" + selfVip + "->...]", "webrtc-connecting", "onChannelOpened: messages to send: " + (connectionMessageQueue[targetVip] && connectionMessageQueue[targetVip].length || 0));
               var messageQueue =  connectionMessageQueue[targetVip] || [];
               connectionMessageQueue[targetVip] = [];

               for(var i = 0; i < messageQueue.length; i++) {
                   self.send(targetVip, messageQueue[i]);
               }
           }

           self.getRTCConnection = function(vip) {
               return connectionSet[vip].getRTCConnection();
           }

           self.send = function(targetVip, message) {
               if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

               var connection = connectionSet[targetVip];

               if(targetVip == selfVip) {

                   if(self.onMessage){
                       window.setTimeout(function(){
                           self.onMessage({message: message,
                                           sourceVIP: selfVip,
                                           endpoint: self});
                       }, 0);

                       return;
                   }

                   return;
               }

               if(!connection) {
                   Log.debug("rtc[" + selfVip + "->...]", "webrtc-connecting", "new-vnf-rtc-connection: " + targetVip);

                   connection = new VNFRTCConnection(self, targetVip, signalingEndpoint);

                   connectionSet[targetVip] = connection;

                   connection.startCaller();
               }

               if(connection.isReady) {
                   try{
                       connection.send(message);
                   }catch(e) {
                       Log.warn("rtc[" + selfVip + "]", "web-rtc", ["Unable to send message via RTC", e]);
                   }

               }else{
                   connectionMessageQueue[targetVip] = connectionMessageQueue[targetVip] || [];
                   connectionMessageQueue[targetVip].push(message);
               }
           }

           self.isConnected = function(targetVip) {
                return connectionSet[targetVip] != undefined;
           }

           self.closeConnection = function(targetVip) {
              if(connectionSet[targetVip]) {
                  connectionSet[targetVip].destroy();

                  connectionSet[targetVip] = undefined;
                  connectionMessageQueue[targetVip] = undefined;

                  self.__fireConnectionLost(targetVip);
                  signalingEndpoint.closeConnection(targetVip);
              }
           }

           self.onDestroy(function() {
               for(var vip in connectionSet) {
                   self.closeConnection(vip);
               }

               connectionSet = {};
               connectionMessageQueue = {};
           });
        };
    };
});
