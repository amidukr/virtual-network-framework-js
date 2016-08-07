define(["utils/logger", "utils/cycle-buffer", "vnf/channel/base/vnf-proxy-hub"], function(Log, CycleBuffer, ProxyHub) {

    return function ReliableHub(hub, args) {
        var selfHub = this;

        ProxyHub.call(selfHub, hub);

        if(!hub) {
            throw new Error("Unable to create instnce of ReliableHub, argument 'hub' cannot be null");
        }

        args = args || {};

        var heartbeatInterval = 300;
        var heartbeatsToInvalidate = args.heartbeatsToInvalidate  || (Math.floor(5000 / heartbeatInterval + 1)); // 5 second by default

        selfHub.VNFEndpoint = function ReliableEndpoint(vip) {
            var self = this;
            selfHub.ProxyEndpoint.call(self, vip);

            
            var parentEndpoint = self.parentEndpoint;

            var channels = {};
            var activeChannels = [];

            function getChannel(targetVIP) {
                var channel = channels[targetVIP];
                if(!channel) {
                    channel = {
                        targetVIP: targetVIP,
                        suspended: true,

                        silenceCycles: 0,

                        lastHeartbeatRequest: -1,
                        lastSentMessageNumber: -1,
                        firstMessageNumberInSendBuffer: 0,
                        sentMessages: new CycleBuffer(),

                        lastMessageProcessed: -1,
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
                        gapBegin: channel.lastMessageProcessed + 1,
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

            function reactivateChannel(channel) {
                if(channel.suspended) {
                    channel.suspended = false;
                    activeChannels.push(channel);

                    if(activeChannels.length == 1) {
                        window.setTimeout(sendHeartbeat, heartbeatInterval);
                    }
                }
            }

            var handlers = {

                "heartbeat": function(event) {
                    var message = event.message;
                    var channel = getChannel(event.sourceVIP);

                    channel.silenceCycles = 0;

                    var prevHearBeatRequest = channel.lastHeartbeatRequest;
                    channel.lastHeartbeatRequest = message.gapBegin;

                    if(message.gapEnd == -1 && prevHearBeatRequest != message.gapBegin) {
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
                                                                  messageNumber: i + message.gapBegin,
                                                                  message: gapMessage});
                        }
                    }
                },

                "message": function(event) {
                    var message = event.message;
                    var channel = getChannel(event.sourceVIP);

                    reactivateChannel(channel);

                    var receivedMessages = channel.receivedMessages;

                    if(message.messageNumber != channel.lastMessageProcessed + 1) {
                        receivedMessages.setValue(message.messageNumber - channel.lastMessageProcessed - 2, message);
                        return;
                    }


                    if(self.onMessage) {
                        self.onMessage({
                            message: message.message,
                            sourceVIP: event.sourceVIP,
                            endpoint: self
                        });
                    }

                    var receivedMessagesLength = receivedMessages.length;
                    var arrayLength = receivedMessages.array.length;
                    var processedMessages = 1;
                    for(var i = 0; i < receivedMessagesLength; i++) {
                        var arrayIndex = receivedMessages.beginPointer + i;
                        arrayIndex %= arrayLength;

                        var message = receivedMessages.array[arrayIndex];
                        if(!message) break;

                        processedMessages++;
                        if(self.onMessage) {
                            self.onMessage({
                                message: message.message,
                                sourceVIP: event.sourceVIP,
                                endpoint: self
                            });
                        }
                    }

                    channel.lastMessageProcessed += processedMessages;
                    receivedMessages.removeFirst(processedMessages);
                }
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

            this.send = function(targetVIP, message) {
                if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

                var channel = getChannel(targetVIP);

                channel.lastSentMessageNumber++;
                channel.sentMessages.push(message);

                parentSend(targetVIP, {type:"message", messageNumber: channel.lastSentMessageNumber, message: message})

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