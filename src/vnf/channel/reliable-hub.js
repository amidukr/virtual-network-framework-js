define(["utils/logger", "utils/cycle-buffer", "vnf/channel/base/vnf-proxy-hub", "utils/random"],
function(Log, CycleBuffer, ProxyHub, Random) {

    var STATE_HANDSHAKING = 'HANDSHAKING';
    var STATE_ACCEPTING   = 'ACCEPTING';
    var STATE_CONNECTED   = 'CONNECTED';

    var MESSAGE_HANDSHAKE         = 'HANDSHAKE';
    var MESSAGE_ACCEPT            = 'ACCEPT';
    var MESSAGE_REGULAR           = 'REGULAR';
    var MESSAGE_HEARTBEAT_ACCEPT  = 'HEARTBEAT-ACCEPT';
    var MESSAGE_HEARTBEAT_REGULAR = 'HEARTBEAT-REGULAR';
    var MESSAGE_CLOSE_CONNECTION  = 'CLOSE-CONNECTION';


    return function ReliableHub(hub, args) {
        var selfHub = this;

        ProxyHub.call(selfHub, hub);

        if(!hub) {
            throw new Error("Unable to create instnce of ReliableHub, argument 'hub' cannot be null");
        }

        args = args || {};

        var heartbeatInterval = 1000;

        var connectionInvalidateInterval = 5000;
        var connectionLostTimeout = 25000;
        var keepAliveHandshakingChannelTimeout = 25000;
        var handshakeRetryInterval = 3000;

        var handshakeRetries = 3;

        var heartbeatsToInvalidate = 0;
        var heartbeatsToDropConnection = 0;
        var heartbeatsToDropHandshakingConnection = 0;
        var heartbeatsToHandshakeRetry = 0;

        var heartbeatDeviation = 0.3;


        function updateHeartbeatCounters() {
            heartbeatsToInvalidate                = Math.round(connectionInvalidateInterval / heartbeatInterval);
            heartbeatsToDropConnection            = Math.round(connectionLostTimeout / heartbeatInterval);
            heartbeatsToDropHandshakingConnection = Math.round(keepAliveHandshakingChannelTimeout / heartbeatInterval);
            heartbeatsToHandshakeRetry            = Math.round(handshakeRetryInterval / heartbeatInterval);
        }

        if(args.heartbeatInterval) {
            heartbeatInterval = args.heartbeatInterval;
            Log.warn(self.vip, "reliable-hub", ["Deprecated code executed, please consider to delete"]);
        }

        updateHeartbeatCounters();

        if(args.heartbeatsToInvalidate) {
            heartbeatsToInvalidate = args.heartbeatsToInvalidate;
            Log.warn(self.vip, "reliable-hub", ["Deprecated code executed, please consider to delete"]);
        }

        selfHub.setHeartbeatInterval = function(value) {
            heartbeatInterval = value;
            updateHeartbeatCounters();
        }

        selfHub.setConnectionInvalidateInterval = function(value) {
            connectionInvalidateInterval = value;
            updateHeartbeatCounters();
        }

        selfHub.setConnectionLostTimeout = function(value) {
            connectionLostTimeout = value;
            updateHeartbeatCounters();
        }

        selfHub.setKeepAliveHandshakingChannelTimeout = function(value) {
            keepAliveHandshakingChannelTimeout = value;
            updateHeartbeatCounters();
        }

        selfHub.setHandshakeRetries = function(value) {
            handshakeRetries = value;
        }

        selfHub.setHandshakeRetryInterval = function(value) {
            handshakeRetryInterval = value;
            updateHeartbeatCounters();
        }

        selfHub.VnfEndpoint = function ReliableEndpoint(vip) {
            var self = this;
            selfHub.ProxyEndpoint.call(self, vip);

            
            var parentEndpoint = self.parentEndpoint;

            var channels = {};
            var activeChannels = [];
            var endpointId = Random.random6();

            function getChannel(targetVip) {
                var channel = channels[targetVip];
                if(!channel) {
                    channel = {
                        targetVip: targetVip,
                        suspended: true,
                        connected: false,

                        state: STATE_HANDSHAKING,
                        sessionIndex: 1,
                        connectionMqStartFrom: -1,
                        sessionId: endpointId + "-1",
                        remoteSessionId: "",

                        toInvalidateCounter: 0,
                        keepAliveActiveConnectionCounter: 0,
                        keepAliveHandshakingCounter: 0,
                        keepAliveHandshakingCounter: 0,

                        lastHeartbeatRequest: -1,
                        lastSentMessageNumber: -1,

                        lastMessage: null,
                        handshakeRetriesIntervalCounter: 0,
                        handshakeRetriesCounter: 0,

                        firstMessageNumberInSendBuffer: 0,
                        sentMessages: new CycleBuffer(),

                        firstMessageNumberInReceivedBuffer: -1,
                        receivedMessages: new CycleBuffer()
                    };
                    channels[targetVip] = channel;
                }

                return channel;
            }

            function handleConnectionOnLost(channel) {
                channel.sessionIndex = channel.sessionIndex + 1;
                channel.connectionMqStartFrom = -1;
                channel.sessionId = endpointId + "-" + channel.sessionIndex;
                channel.remoteSessionId = "";

                channel.lastHeartbeatRequest = -1;

                channel.lastMessage = null;
                channel.handshakeRetriesCounter = 0;
                channel.handshakeRetriesIntervalCounter = 0;


                channel.firstMessageNumberInReceivedBuffer = -1;
                channel.receivedMessages = new CycleBuffer();

                if(channel.connected || channel.state != STATE_HANDSHAKING) {
                    channel.connected = false;
                    channel.state = STATE_HANDSHAKING;
                    channel.keepAliveHandshakingCounter = 0;
                    self.__fireConnectionLost(channel.targetVip);
                }
            }

            function parentSend(targetVip, message) {
                try{
                    parentEndpoint.send(targetVip, message);
                }catch(error) {
                    Log.warn(self.vip, "reliable-hub", [new Error("Unable to send message"), error]);
                }
            }

            function sendHandshakeMessage(channel, messageIndex, message) {
                parentSend(channel.targetVip, {type:         MESSAGE_HANDSHAKE,
                                               sessionId:    channel.sessionId,
                                               messageIndex: messageIndex,
                                               payload:      message});
            }

            function sendAcceptMessage(channel, messageIndex, message) {
                parentSend(channel.targetVip, {type:         MESSAGE_ACCEPT,
                                               sessionId:    channel.sessionId,
                                               toSID:        channel.remoteSessionId,
                                               mqStartFrom:  channel.connectionMqStartFrom,
                                               messageIndex: messageIndex,
                                               payload:      message});
            }

            function sendRegularMessage(channel, messageIndex, message) {
                parentSend(channel.targetVip, {type:         MESSAGE_REGULAR,
                                               toSID:        channel.remoteSessionId,
                                               messageIndex: messageIndex,
                                               payload:      message});
            }

            function sendAcceptHeartbeatMessage(channel, gapBegin, gapEnd) {
                parentSend(channel.targetVip, {type:         MESSAGE_HEARTBEAT_ACCEPT,
                                               sessionId:    channel.sessionId,
                                               toSID:        channel.remoteSessionId,
                                               mqStartFrom:  channel.connectionMqStartFrom,
                                               gapBegin:     gapBegin,
                                               gapEnd:       gapEnd});
            }

            function sendRegularHeartbeatMessage(channel, gapBegin, gapEnd) {
                parentSend(channel.targetVip, {type:      MESSAGE_HEARTBEAT_REGULAR,
                                               toSID:     channel.remoteSessionId,
                                               gapBegin:  gapBegin,
                                               gapEnd:    gapEnd});
            }

            function sendCloseMessage(channel) {
                parentSend(channel.targetVip, {type: MESSAGE_CLOSE_CONNECTION,
                                               sessionId:    channel.sessionId,
                                               toSID:        channel.remoteSessionId});
            }

            var messageSender =   {'HANDSHAKING': sendHandshakeMessage,
                                   'ACCEPTING':   sendAcceptMessage,
                                   'CONNECTED':   sendRegularMessage};

            var heartbeatSender = {'ACCEPTING':   sendAcceptHeartbeatMessage,
                                   'CONNECTED':   sendRegularHeartbeatMessage};


            function sendHeartbeat(channel) {
                var instanceId = "reliable[" + endpointId + ":" + vip + "->" + channel.targetVip + "]";

                channel.toInvalidateCounter++;
                channel.keepAliveActiveConnectionCounter++;

                Log.debug(instanceId, "reliable-channel-status",
                      "invalidate: " + channel.toInvalidateCounter              + "/" + heartbeatsToInvalidate + ", "
                    + "keep-alive: " + channel.keepAliveActiveConnectionCounter + "/" + heartbeatsToDropConnection
                );  

                if(channel.keepAliveActiveConnectionCounter >= heartbeatsToDropConnection) {
                    channel.keepAliveActiveConnectionCounter = 0;

                    Log.warn(instanceId, "reliable-channel-status", "connection closed due to silence in channel");

                    self.closeConnection(channel.targetVip);
                    return;
                }

                if(channel.toInvalidateCounter >= heartbeatsToInvalidate) {
                    channel.toInvalidateCounter = 0;
                    parentEndpoint.closeConnection && parentEndpoint.closeConnection(channel.targetVip);

                    Log.warn(instanceId, "reliable-channel-status", "re-creating connection due to silence");

                    if(!parentEndpoint.closeConnection) {
                        Log.error("reliable-hub", ["Invalidate for parent endpoint is not defined, parent peer: ", parentEndpoint])
                    }
                }



                var gapBegin = channel.firstMessageNumberInReceivedBuffer + 1;
                var gapEnd   = -1;

                var receivedMessagesLength = channel.receivedMessages.length;
                if(receivedMessagesLength > 0) {
                    var i;

                    var array = channel.receivedMessages.array;
                    var beginPointer = channel.receivedMessages.beginPointer;
                    var arrayLength = array.length;

                    for(i = 0; i < receivedMessagesLength; i++) {
                        if(array[(beginPointer + i) % arrayLength]) {
                            break;
                        }
                    }

                    gapEnd = gapBegin + i;
                }

                var sendHeartbeatMethod = heartbeatSender[channel.state];
                if(sendHeartbeatMethod) {
                    sendHeartbeatMethod(channel, gapBegin, gapEnd);
                }else{
                    Log.error("reliable-hub", ["Heartbeats processing: Unexpected channel state: '" + channel.state + "'"])
                }
            }

            function refreshHandshakingChannel(channel) {
                var instanceId = "reliable[" + endpointId + ":" + vip + "->" + channel.targetVip + "]";
                Log.debug(instanceId, "reliable-channel-status",
                "handshake-retry-interval: " + (channel.handshakeRetriesIntervalCounter + 1) + "/" + heartbeatsToHandshakeRetry + ", "
                + "handshake-retries: " + (channel.handshakeRetriesCounter + 1) + "/" + handshakeRetries + ","
                + "handshake-keep-alive: " + (channel.keepAliveHandshakingCounter + 1) + "/" + heartbeatsToDropHandshakingConnection);

                if(channel.lastMessage) {

                    channel.handshakeRetriesIntervalCounter++;

                    if(channel.handshakeRetriesIntervalCounter >= heartbeatsToHandshakeRetry) {

                        channel.handshakeRetriesIntervalCounter = 0;

                        channel.handshakeRetriesCounter++;
                        if(channel.handshakeRetriesCounter > handshakeRetries) {
                            channel.lastMessage = null;
                            channel.handshakeRetriesCounter = 0;
                        }else{
                            parentEndpoint.closeConnection(channel.targetVip);
                            sendHandshakeMessage(channel, channel.lastSentMessageNumber, channel.lastMessage);
                            Log.debug(instanceId, "reliable-channel-status", "handshake retry")
                        }
                    }
                }

                channel.keepAliveHandshakingCounter++;
                if(channel.keepAliveHandshakingCounter >= heartbeatsToDropHandshakingConnection) {
                    parentEndpoint.closeConnection && parentEndpoint.closeConnection(channel.targetVip);
                    self.__fireConnectionLost(channel.targetVip);
                    channel.suspended = true;
                    Log.debug(instanceId, "reliable-channel-status", "closing connection")
                }
            }

            function onTimeEvent() {
                var channelsToDeactivate = [];

                for(var i = 0; i < activeChannels.length; i++) {
                    var channel = activeChannels[i];

                    if(channel.state == STATE_HANDSHAKING) {
                        refreshHandshakingChannel(channel);

                    }else{
                        sendHeartbeat(channel)
                    }

                    if(channel.suspended) {
                        channelsToDeactivate.push(channel);
                    }
                }

                for(var i = 0; i < channelsToDeactivate.length; i++) {
                    activeChannels.removeValue(channelsToDeactivate[i]);
                }

                if(activeChannels.length > 0) {
                    var nextInterval = heartbeatInterval * (1 + (Math.random() * 2 - 1) * heartbeatDeviation);
                    window.setTimeout(onTimeEvent, nextInterval);
                }
            }


            function newConnection(channel, message, mqStartFrom) {
                channel.remoteSessionId = message.sessionId;
                channel.lastHeartbeatRequest = -1;
                channel.connectionMqStartFrom = channel.lastSentMessageNumber + 1;

                if(mqStartFrom > channel.firstMessageNumberInReceivedBuffer) {
                    channel.receivedMessages.removeFirst(mqStartFrom - channel.firstMessageNumberInReceivedBuffer - 1);
                    channel.firstMessageNumberInReceivedBuffer = mqStartFrom - 1;
                }
            }



            var allowedMessageStates = {
                "HANDSHAKE":         {"HANDSHAKING": true,  "ACCEPTING": true, "CONNECTED": false},
                "ACCEPT":            {"HANDSHAKING": true,  "ACCEPTING": true, "CONNECTED": true},
                "HEARTBEAT-ACCEPT":  {"HANDSHAKING": true,  "ACCEPTING": true, "CONNECTED": true},
                "REGULAR":           {"HANDSHAKING": false, "ACCEPTING": true, "CONNECTED": true},
                "HEARTBEAT-REGULAR": {"HANDSHAKING": false, "ACCEPTING": true, "CONNECTED": true},
                "CLOSE-CONNECTION":  {"HANDSHAKING": true,  "ACCEPTING": true, "CONNECTED": true}
            };

            var verifyRemoteSession = {
                "HANDSHAKE":         {"HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
                "ACCEPT":            {"HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
                "HEARTBEAT-ACCEPT":  {"HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
                "REGULAR":           {"HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false},
                "HEARTBEAT-REGULAR": {"HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false},
                "CLOSE-CONNECTION":  {"HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true}
            };

            function verifyIfPhantom(channel, message) {
                if(message.toSID && message.toSID != channel.sessionId) return "message.toSID different to channel.sessionId";

                var messageType = message.type;
                var channelState = channel.state;

                if(!allowedMessageStates[messageType][channelState])
                    return "Message type: '" + messageType + "' isn't allowed for channel state: '" + channelState + "'";

                if(verifyRemoteSession[messageType][channelState]) {
                    if(channel.remoteSessionId != message.sessionId)
                        return "Message sessionId isn't the same to channel.remoteSessionId," +
                        " for messageType: '" + messageType + "' and channelState: '"  + channelState + "'";
                }

                return false;
            }

            function updateChannelState(channel, message) {
                if(channel.state == STATE_CONNECTED) return;

                channel.connected = true;

                if(channel.state == STATE_HANDSHAKING) {
                    if(message.type == MESSAGE_HANDSHAKE) {
                        channel.state = STATE_ACCEPTING;

                        newConnection(channel, message, message.messageIndex);
                        return;
                    }

                    if(message.type == MESSAGE_ACCEPT || message.type == MESSAGE_HEARTBEAT_ACCEPT) {
                        channel.state = STATE_CONNECTED;

                        newConnection(channel, message, message.mqStartFrom);
                        return;
                    }

                }

                if(channel.state == STATE_ACCEPTING) {
                    if(message.type == MESSAGE_ACCEPT  || message.type == MESSAGE_HEARTBEAT_ACCEPT
                    || message.type == MESSAGE_REGULAR || message.type == MESSAGE_HEARTBEAT_REGULAR) {
                        channel.state = STATE_CONNECTED;
                        return;
                    }
                }
            }

            function reactivateChannel(channel) {
                if(channel.suspended) {
                    channel.suspended = false;
                    channel.keepAliveHandshakingCounter = 0;
                    activeChannels.push(channel);

                    if(activeChannels.length == 1) {
                        window.setTimeout(onTimeEvent, heartbeatInterval);
                    }
                }
            }

            function heartbeatGapProcessing(event, channel, message) {
                var prevHeartBeatRequest = channel.lastHeartbeatRequest;
                channel.lastHeartbeatRequest = message.gapBegin;

                // performance optimization- to not flood the network
                // to avoid double sending of message, responding to gap only after second heartbeat
                // due to network latencies heartbeat can be out-dated, while message is delivered
                if(message.gapEnd == -1 && prevHeartBeatRequest != message.gapBegin) {
                    return;
                }

                var sentMessages = channel.sentMessages;
                if(channel.firstMessageNumberInSendBuffer < message.gapBegin) {
                    sentMessages.removeFirst(message.gapBegin - channel.firstMessageNumberInSendBuffer);
                    channel.firstMessageNumberInSendBuffer = message.gapBegin;
                }


                var array = sentMessages.array;
                for(var i = 0; i < sentMessages.length; i++) {
                    if(message.gapEnd != -1 && message.gapEnd < i + message.gapBegin) {
                        break;
                    }

                    var gapMessage = array[(i + sentMessages.beginPointer) % array.length];

                    if(gapMessage) {
                        sendRegularMessage(channel, i + message.gapBegin, gapMessage);
                    }
                }
            }

            function messageGapProcessing(event, channel, message) {
                var receivedMessages = channel.receivedMessages;

                if(message.messageIndex == channel.firstMessageNumberInReceivedBuffer + 1) {
                    if(self.onMessage) {
                        self.onMessage({
                            message: message.payload,
                            sourceVip: event.sourceVip,
                            endpoint: self
                        });
                    }
                }else {
                    if(message.messageIndex > channel.firstMessageNumberInReceivedBuffer) {
                        receivedMessages.setValue(message.messageIndex - channel.firstMessageNumberInReceivedBuffer - 2, message);
                    }

                    return;
                }

                var processedMessages = 1;

                var receivedMessagesLength = receivedMessages.length;
                var arrayLength = receivedMessages.array.length;

                for(var i = 0; i < receivedMessagesLength; i++) {
                    var arrayIndex = receivedMessages.beginPointer + i;
                    arrayIndex %= arrayLength;

                    var message = receivedMessages.array[arrayIndex];
                    if(!message) break;

                    processedMessages++;
                    if(self.onMessage) {
                        self.onMessage({
                            message: message.payload,
                            sourceVip: event.sourceVip,
                            endpoint: self
                        });
                    }
                }

                channel.firstMessageNumberInReceivedBuffer += processedMessages;
                receivedMessages.removeFirst(processedMessages);
            }

            function handleHeartbeat(event, channel, message) {
                try{
                    self.onHeartbeat && self.onHeartbeat(event);
                }catch(error) {
                    Log.error(self.vip, "reliable-hub", [new Error("onHeartbeat handler thrown error"), error]);
                }

                updateChannelState(channel, message);
                heartbeatGapProcessing(event, channel, message);
            }

            function handleMessage(event, channel, message) {
                updateChannelState(channel, message);
                messageGapProcessing(event, channel, message);
            }

            function handleCloseMessage(event, channel, message) {
                handleConnectionOnLost(channel);
            }

            var handlers = {
                "HEARTBEAT-ACCEPT":  handleHeartbeat,
                "HEARTBEAT-REGULAR": handleHeartbeat,

                "HANDSHAKE": handleMessage,
                "ACCEPT":    handleMessage,
                "REGULAR":   handleMessage,

                "CLOSE-CONNECTION": handleCloseMessage
            }

            parentEndpoint.onMessage = function(event) {
                if(self.isDestroyed()) {
                    console.warn("ReliableHub: Unable to handle message, since endpoint destroyed");
                }

                //Log.debug(self.vip, "reliable-hub", "onMessage: " + JSON.stringify(event));

                var message = event.message;
                var channel = getChannel(event.sourceVip);

                var handler = handlers[event.message.type];

                if(!handler) {
                    throw new Error("ReliableHub: Unknown message type received: " + message.type);
                }

                var phantomError = verifyIfPhantom(channel, message);
                if(phantomError) {
                    Log.warn("reliable-hub", ["Phantom detected: " + phantomError,  event, channel])
                    return;
                }

                channel.toInvalidateCounter = 0;
                channel.keepAliveActiveConnectionCounter = 0;
                reactivateChannel(channel);

                handler(event, channel, message);
            }

            this.setEndpointId = function(value) {
                endpointId = value;
            }

            this.send = function(targetVip, message) {
                if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

                var channel = getChannel(targetVip);
                channel.connected = true;

                channel.lastSentMessageNumber++;
                channel.sentMessages.push(message);

                if(channel.state == STATE_HANDSHAKING) {
                    channel.lastMessage = message;
                    channel.handshakeRetriesCounter = 0;
                    channel.handshakeRetriesIntervalCounter = 0;
                }

                var sendMessageMethod = messageSender[channel.state];
                sendMessageMethod(channel, channel.lastSentMessageNumber, message)

                reactivateChannel(channel);
            }

           self.isConnected = function(targetVip) {
                var channel = channels[targetVip];
                return parentEndpoint.isConnected(targetVip) && channel && channel.connected;
           }

            this.closeConnection = function(targetVip) {
                var channel = channels[targetVip];
                if(channel) {
                    if(parentEndpoint.isConnected(targetVip)) {
                        sendCloseMessage(channel);
                        channel.suspended = true;
                    }

                    parentEndpoint.closeConnection(targetVip);

                    handleConnectionOnLost(channel);
                }
            }

            var parentDestroy = self.destroy;
            self.destroy = function() {
                for(var connectedVip in channels){
                    self.closeConnection(connectedVip);
                }

                activeChannels = [];
                parentDestroy();
            };
        }
    }
});