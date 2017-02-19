define(["utils/logger", "utils/cycle-buffer", "vnf/channel/base/vnf-proxy-hub", "utils/random"],
function(Log, CycleBuffer, ProxyHub, Random) {

    var STATE_HANDSHAKING = 'HANDSHAKING';
    var STATE_ACCEPTING   = 'ACCEPTING';
    var STATE_CONNECTED   = 'CONNECTED';

    var MESSAGE_HANDSHAKE = 'HANDSHAKE';
    var MESSAGE_ACCEPT    = 'ACCEPT';
    var MESSAGE_REGULAR   = 'REGULAR';

    return function ReliableHub(hub, args) {
        var selfHub = this;

        ProxyHub.call(selfHub, hub);

        if(!hub) {
            throw new Error("Unable to create instnce of ReliableHub, argument 'hub' cannot be null");
        }

        args = args || {};

        var heartbeatInterval = args.heartbeatInterval || 300;
        var heartbeatsToInvalidate = args.heartbeatsToInvalidate  || (Math.floor(5000 / heartbeatInterval + 1)); // 5 second by default

        selfHub.VNFEndpoint = function ReliableEndpoint(vip) {
            var self = this;
            selfHub.ProxyEndpoint.call(self, vip);

            
            var parentEndpoint = self.parentEndpoint;

            var channels = {};
            var activeChannels = [];
            var endpointId = Random.random6();




            function getChannel(targetVIP) {
                var channel = channels[targetVIP];
                if(!channel) {
                    channel = {
                        targetVIP: targetVIP,
                        suspended: true,

                        state: STATE_HANDSHAKING,
                        sessionIndex: 1,
                        connectionMqStartFrom: -1,
                        sessionId: endpointId + "-1",
                        remoteSessionId: "",

                        silenceCycles: 0,

                        lastHeartbeatRequest: -1,
                        lastSentMessageNumber: -1,


                        firstMessageNumberInSendBuffer: 0,
                        sentMessages: new CycleBuffer(),

                        firstMessageNumberInReceivedBuffer: -1,
                        receivedMessages: new CycleBuffer()
                    };
                    channels[targetVIP] = channel;
                }

                return channel;
            }

            function parentSend(targetVIP, message) {
                try{
                    parentEndpoint.send(targetVIP, message);
                }catch(error) {
                    Log.warn(self.vip, "reliable-hub", [new Error("Unable to send message"), error]);
                }
            }

            function sendHeartbeat() {
                for(var i = 0; i < activeChannels.length; i++) {
                    var channel = activeChannels[i];

                    channel.silenceCycles++;                        
                    if(channel.silenceCycles > heartbeatsToInvalidate) {
                        channel.silenceCycles = 0;
                        parentEndpoint.invalidate && parentEndpoint.invalidate(channel.targetVIP);

                        if(!parentEndpoint.invalidate) {
                            Log.error("reliable-hub", ["Invalidate for parent endpoint is not defined, parent peer: ", parentEndpoint])
                        }
                    }
                    

                    var message = {
                        type: "heartbeat",
                        gapBegin: channel.firstMessageNumberInReceivedBuffer + 1,
                        gapEnd: -1,
                    }

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

                        message.gapEnd = message.gapBegin + i;
                    }

                    parentSend(channel.targetVIP, message);
                }

                if(activeChannels.length > 0) {
                    window.setTimeout(sendHeartbeat, heartbeatInterval);
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
                "HANDSHAKE": {"HANDSHAKING": true,  "ACCEPTING": true, "CONNECTED": false},
                "ACCEPT":    {"HANDSHAKING": true,  "ACCEPTING": true, "CONNECTED": true},
                "REGULAR":   {"HANDSHAKING": false, "ACCEPTING": true, "CONNECTED": true}
            };

            var verifyRemoteSession = {
                "HANDSHAKE": {"HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
                "ACCEPT":    {"HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
                "REGULAR":   {"HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false}
            };

            function isPhantom(channel, message) {
                if(message.toSID && message.toSID != channel.sessionId) return true;

                var messageType = message.type;
                var channelState = channel.state;

                if(!allowedMessageStates[messageType][channelState]) return true;

                if(verifyRemoteSession[messageType][channelState]) {
                    if(channel.remoteSessionId != message.sessionId) return true;
                }

                return false;
            }

            function updateChannelState(channel, message) {
                if(channel.state == STATE_CONNECTED) return;

                if(channel.state == STATE_HANDSHAKING && message.type == MESSAGE_HANDSHAKE) {
                    channel.state = STATE_ACCEPTING;

                    newConnection(channel, message, message.messageIndex);
                }

                if(channel.state == STATE_HANDSHAKING && message.type == MESSAGE_ACCEPT) {
                    channel.state = STATE_CONNECTED;

                    newConnection(channel, message, message.mqStartFrom);
                }

                if(channel.state == STATE_ACCEPTING) {
                    if(message.type == MESSAGE_ACCEPT || message.type == MESSAGE_REGULAR) {
                        channel.state = STATE_CONNECTED;
                    }
                }
            }

            function reactivateChannel(channel) {
                if(channel.suspended) {
                    channel.suspended = false;
                    activeChannels.push(channel);

                    if(activeChannels.length == 1) {
                        window.setTimeout(sendHeartbeat, heartbeatInterval);
                    }
                }
            }

            function messageGapProcessing(event, channel, message) {
                var receivedMessages = channel.receivedMessages;

                if(message.messageIndex == channel.firstMessageNumberInReceivedBuffer + 1) {
                    if(self.onMessage) {
                        self.onMessage({
                            message: message.payload,
                            sourceVIP: event.sourceVIP,
                            endpoint: self
                        });
                    }
                }else {
                    receivedMessages.setValue(message.messageIndex - channel.firstMessageNumberInReceivedBuffer - 2, message);
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

                    receivedMessages.array[arrayIndex] = null;

                    processedMessages++;
                    if(self.onMessage) {
                        self.onMessage({
                            message: message.payload,
                            sourceVIP: event.sourceVIP,
                            endpoint: self
                        });
                    }
                }

                channel.firstMessageNumberInReceivedBuffer += processedMessages;
                receivedMessages.removeFirst(processedMessages);
            }

            function handleMessage(event) {
                var message = event.message;
                var channel = getChannel(event.sourceVIP);

                if(isPhantom(channel, message)) {
                    Log.warn("reliable-hub", ["Phantom detected: ", event, channel])
                    return;
                }

                updateChannelState(channel, message);
                reactivateChannel(channel);
                messageGapProcessing(event, channel, message);
            }

            var handlers = {

                "heartbeat": function(event) {
                    try{
                        self.onHeartbeat && self.onHeartbeat(event);
                    }catch(error) {
                        Log.error(self.vip, "reliable-hub", [new Error("onHeartbeat handler thrown error"), error]);
                    }

                    var message = event.message;
                    var channel = getChannel(event.sourceVIP);

                    channel.silenceCycles = 0;

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
                            parentSend(event.sourceVIP, {type:"message",
                                                         messageIndex: i + message.gapBegin,
                                                         message: gapMessage});
                        }
                    }
                },

                "HANDSHAKE": handleMessage,
                "ACCEPT": handleMessage,
                "REGULAR": handleMessage
            }

            parentEndpoint.onMessage = function(event) {
                if(self.isDestroyed()) {
                    console.warn("ReliableHub: Unable to handle message, since endpoint destroyed");
                }

                //Log.debug(self.vip, "reliable-hub", "onMessage: " + JSON.stringify(event));

                var message = event.message;

                var handler = handlers[event.message.type];

                if(!handler) {
                    throw new Error("ReliableHub: Unknown message type received: " + message.type);
                }

                handler(event);
            }

            this.setEndpointId = function(value) {
                endpointId = value;
            }

            this.setHeartbeatInterval = function(value) {
                heartbeatInterval = value;
            }

            this.send = function(targetVIP, message) {
                if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

                var channel = getChannel(targetVIP);

                channel.lastSentMessageNumber++;
                channel.sentMessages.push(message);

                if(channel.state == STATE_CONNECTED) {
                    parentSend(targetVIP, {type:         MESSAGE_REGULAR,
                                           toSID:        channel.remoteSessionId,
                                           messageIndex: channel.lastSentMessageNumber,
                                           payload:      message});
                }else if(channel.state == STATE_ACCEPTING) {
                    parentSend(targetVIP, {type:         MESSAGE_ACCEPT,
                                           sessionId:    channel.sessionId,
                                           toSID:        channel.remoteSessionId,
                                           mqStartFrom:  channel.connectionMqStartFrom,
                                           messageIndex: channel.lastSentMessageNumber,
                                           payload:      message});
                }else if(channel.state == STATE_HANDSHAKING) {
                    parentSend(targetVIP, {type:         MESSAGE_HANDSHAKE,
                                           sessionId:    channel.sessionId,
                                           messageIndex: channel.lastSentMessageNumber,
                                           payload:      message});
                }else {
                    throw new Error("Message not send, unexpected channel state: " + channel.state);
                }


                reactivateChannel(channel);
            }

            this.onInvalidate(function(targetVIP) {
                var channel = channels[targetVIP];
                delete channels[targetVIP];
                activeChannels.removeValue(channel);
            });

            this.onDestroy(function() {
                activeChannels = [];
            });
        }
    }
});