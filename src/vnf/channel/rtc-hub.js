define(["utils/logger"], function(Log) {

    window.RTCPeerConnection     = window.RTCPeerConnection     || window.mozRTCPeerConnection     || window.webkitRTCPeerConnection;
    window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
    window.RTCIceCandidate       = window.RTCIceCandidate       || window.mozRTCIceCandidate       || window.webkitRTCIceCandidate;

    var servers = {
        iceServers: [
            {url: "stun:23.21.150.121"},
            {url: "stun:stun.1.google.com:19302"}
        ]
    };

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

    function VNFRTCConnection(rtcChannel, targetVip, signalingChannel) {
        var connectionIndex = connectionNextId++;
        
        var self = this;
        var instanceId = "rtc[connection-" + connectionIndex + ": " + rtcChannel.vip + "->" + targetVip + "]";

        var connection = null;
        var channel = null;
        var ice = null;

        self.createDate = new Date().getTime();


        function onChannelCreated(channelArgument) {
            Log.debug(instanceId, "webrtc-connecting", "onChannelCreated: " + channelArgument);
            var channel = channelArgument;

            channel.onopen = function(event) {
                Log.debug(instanceId, "webrtc-connecting", "onChannelOpened: " + event);

                self.channel = channel;
                self.isReady = true;

                if(rtcChannel.onChannelOpened) {
                    rtcChannel.onChannelOpened(targetVip, channel);
                }
            }

            channel.onmessage = function(e) {
                rtcChannel.onMessage({message: e.data,
                                      sourceVIP: targetVip,
                                      channel: rtcChannel});
            }
        }

        function acceptIce(ice ) {
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
            connection = new RTCPeerConnection(servers);

            ice = {candidate: []};
            self.isReady = false;

            connection.onsignalingstatechange = function(evt){
                Log.debug(instanceId, "webrtc-onsignalingstatechange", "\n" + printStatuses(evt.target));
            };

            connection.oniceconnectionstatechange = function(evt){
                Log.debug(instanceId, "webrtc-oniceconnectionstatechange", "\n" + printStatuses(evt.target));
            };

            connection.onicecandidate = function(evt){
                Log.debug(instanceId, "webrtc-connecting", "onicecandidate: " + JSON.stringify(evt.candidate));

                if(evt.candidate != null) ice.candidate.push(evt.candidate);

                if(evt.candidate == null) {
                    var message =  {type: "rtc-connection", 
                                    requestForNewConnection: self.isCaller, 
                                    ice: ice,
                                    connectionCreateDate: self.createDate};
                    Log.debug(instanceId, "webrtc-connecting", "send-signal to " + targetVip + ": " + JSON.stringify(message));
                    signalingChannel.send(targetVip, message);
                }
            }
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
                onChannelCreated(event.channel);
            }
        }
    }

    function RTCChannel(selfVip, signalingChannel) {
       var self = this;

       self.vip = selfVip;

       var connectionSet = {}
       var connectionQueue = {}

       self.onMessage = null;

       signalingChannel.onMessage = function(event) {
           if(event.message.type == "rtc-connection") {
                Log.debug("rtc[" + selfVip + "->...]", "webrtc-connecting", "handling-signal-message: " + JSON.stringify(event));

                var targetVip = event.sourceVIP;
                var message = event.message;

                if(event.message.requestForNewConnection) {
                    if(connectionSet[targetVip] && event.message.connectionCreateDate < connectionSet[targetVip].createDate) {
                        Log.debug("rtc[" + selfVip + "->...]", "webrtc-connecting", "ignore-action/connection-expired:" + JSON.stringify(event));
                        return;
                    }

                    connectionSet[targetVip] = new VNFRTCConnection(self, targetVip, signalingChannel);
                    connectionSet[targetVip].startCallee(message);
                }else{
                    connectionSet[targetVip].acceptCalleeResponse(event);
                }
           }
       }

       self.onChannelOpened = function(targetVip, channel) {
           Log.debug("rtc[" + selfVip + "->...]", "webrtc-connecting", "onChannelOpened: " + connectionQueue[targetVip]);
           var messageQueue =  connectionQueue[targetVip] || [];
           connectionQueue[targetVip] = [];

           for(var i = 0; i < messageQueue.length; i++) {
               self.send(targetVip, messageQueue[i]);
           }
       }

       self.send = function(targetVip, message) {
           var connection = connectionSet[targetVip];

           if(targetVip == selfVip) {

               if(self.onMessage){
                   window.setTimeout(function(){
                       self.onMessage({message: message,
                                       sourceVIP: selfVip,
                                       channel: self});
                   }, 0);
                   
                   return;
               }

               return;
           }

           if(!connection) {
               Log.debug("rtc[" + selfVip + "->...]", "webrtc-connecting", "new-vnf-rtc-connection: " + targetVip);

               connection = new VNFRTCConnection(self, targetVip, signalingChannel);

               connectionQueue[targetVip] = connectionQueue[targetVip] || [];
               connectionSet[targetVip] = connection;

               connection.startCaller();
           }

           if(connection.isReady) {
               connection.channel.send(message);
           }else{
               connectionQueue[targetVip].push(message);
           }
       }
    };

    return function RTCHub(signalingHub){
        var self = this;

        var hub = {};

        self.openChannel = function openChannel(vip) {
            var channel = hub[vip];
            if(!channel) {
                channel = new RTCChannel(vip, signalingHub.openChannel(vip));
                hub[vip] = channel;
          }

          return channel;
        }
    };
});