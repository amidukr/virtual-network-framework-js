import {Log}          from "../../utils/logger.js";
import {CycleBuffer}  from "../../utils/cycle-buffer.js";
import {Random}       from "../../utils/random.js";

import {Global}   from "../global.js";
import {ProxyHub} from "./base/vnf-proxy-hub.js";

import {ReliableMessageSerializer}  from "./reliable/reliable-message-serializer.js";

var STATE_NO_ACTION   = 'NO-ACTION';
var STATE_HANDSHAKING = 'HANDSHAKING';
var STATE_ACCEPTING   = 'ACCEPTING';
var STATE_CONNECTED   = 'CONNECTED';

var MESSAGE_HANDSHAKE   = 'HANDSHAKE';
var MESSAGE_ACCEPT      = 'ACCEPT';
var MESSAGE_DATA        = 'MESSAGE';
var MESSAGE_HEARTBEAT   = 'HEARTBEAT';
var MESSAGE_CLOSE_CONNECTION  = 'CLOSE-CONNECTION';


export function ReliableHub(hub, args) {
    var selfHub = this;

    ProxyHub.call(selfHub, hub);

    if(!hub) {
        throw new Error("Unable to create instnce of ReliableHub, argument 'hub' cannot be null");
    }

    args = args || {};

    var heartbeatInterval = 3000;

    var connectionInvalidateInterval = 9000;
    var connectionLostTimeout = 30000;


    var heartbeatsToInvalidate = 0;
    var heartbeatsToDropConnection = 0;

    var heartbeatDeviation = 0.3;


    function updateHeartbeatCounters() {
        heartbeatsToInvalidate     = Math.round(connectionInvalidateInterval / heartbeatInterval);
        heartbeatsToDropConnection = Math.round(connectionLostTimeout        / heartbeatInterval);
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

    selfHub.VnfEndpoint = function ReliableEndpoint(vip) {
        var self = this;
        selfHub.ProxyEndpoint.call(self, vip);

        var parentEndpoint = self.parentEndpoint;
        var endpointId = Random.random6();

        var nextSessionIndex = 1;
        var timerActive = false;

        var dropQueueNonEmpty = false;
        var dropParentConnectionQueue = {}

        function resetConnection(connection, targetVip, state) {
            connection.targetVip = targetVip;
            connection.sessionIndex = nextSessionIndex++;
            connection.sessionId = endpointId + "-" + connection.sessionIndex;

            connection.silenceCounter = 0;

            connection.lastHeartbeatRequest = -1;

            connection.lastSentMessageNumber = -1;

            connection.firstMessageNumberInSendBuffer = 0;
            connection.sentMessages = new CycleBuffer();

            connection.firstMessageNumberInReceivedBuffer = -1;
            connection.receivedMessages = new CycleBuffer();

            connection.closeConnectionHandled = false;

            setConnectionState(connection, state);

            resetTimer();
        }

        function parentSend(targetVip, messageJson) {
            try{
                var messageString = ReliableMessageSerializer.serialize(messageJson);

                parentEndpoint.openConnection(targetVip, function parentOpenConnectionCallback(){
                    try{
                        parentEndpoint.send(targetVip, messageString);
                    }catch(error) {
                        Log.warn(self.vip, "reliable-hub", [new Error("Unable to send message"), error]);
                    }
                })
            }catch(error) {
                Log.warn(self.vip, "reliable-hub", [new Error("Unable to send message"), error]);
            }
        }

        function sendHandshakeMessage(connection) {
            parentSend(connection.targetVip, {type:    MESSAGE_HANDSHAKE,
                                              fromSid: connection.sessionId});
        }

        function sendAcceptMessage(connection) {
            parentSend(connection.targetVip, {type:      MESSAGE_ACCEPT,
                                              fromSid:   connection.sessionId,
                                              toSid:     connection.remoteSessionId});
        }

        function sendHeartbeatMessage(connection, gapBegin, gapEnd) {
            parentSend(connection.targetVip, {type:      MESSAGE_HEARTBEAT,
                                              fromSid:   connection.sessionId,
                                              toSid:     connection.remoteSessionId,
                                              gapBegin:  gapBegin,
                                              gapEnd:    gapEnd});
        }

        function sendDataMessage(connection, messageIndex, message) {
            parentSend(connection.targetVip, {type: MESSAGE_DATA,
                                              toSid: connection.remoteSessionId,
                                              messageIndex: messageIndex,
                                              payload: message})
        }

        function sendCloseConnectionMessage(connection) {
            parentSend(connection.targetVip, {type: MESSAGE_CLOSE_CONNECTION,
                                              toSid: connection.remoteSessionId,
                                              fromSid: connection.sessionId})
        }

        function sendRefreshConnectionMessage(connection) {
            if(connection.state == STATE_CONNECTED) {
                var gapBegin = connection.firstMessageNumberInReceivedBuffer + 1;
                var gapEnd   = -1;

                var receivedMessagesLength = connection.receivedMessages.length;
                if(receivedMessagesLength > 0) {
                    var i;

                    var array = connection.receivedMessages.array;
                    var beginPointer = connection.receivedMessages.beginPointer;
                    var arrayLength = array.length;

                    for(i = 0; i < receivedMessagesLength; i++) {
                        if(array[(beginPointer + i) % arrayLength]) {
                            break;
                        }
                    }

                    gapEnd = gapBegin + i;
                }

                sendHeartbeatMessage(connection, gapBegin, gapEnd);
                return;
            }

            if(connection.state == STATE_ACCEPTING) {
                sendAcceptMessage(connection);
                return;
            }

            if(connection.state == STATE_HANDSHAKING) {
                sendHandshakeMessage(connection);
                return;
            }

            if(connection.state == STATE_NO_ACTION) {
                  return;
            }

            var instanceId = "reliable[" + endpointId + ":" + vip + "->" + connection.targetVip + "]";
            Log.error(instanceId, "send-refresh-connection-message", "Unexpected connection state: '" + connection.state + "'");
        }

        function refreshConnection(connection) {

            connection.silenceCounter++;
            var invalidateConnectionCounter = connection.silenceCounter % heartbeatsToInvalidate;

            var instanceId = "reliable[" + endpointId + ":" + vip + "->" + connection.targetVip + "]";

            Log.debug(instanceId, "reliable-channel-status",
              "connection-invalidate: " + invalidateConnectionCounter + "/" + heartbeatsToInvalidate + "; "
            + "connection-keep-alive: " + connection.silenceCounter   + "/" + heartbeatsToDropConnection);



            if(connection.silenceCounter >= heartbeatsToDropConnection) {
                if(connection.state == STATE_ACCEPTING && connection.callback != null) {
                    Log.debug(instanceId, "reliable-channel-status", "fallback to handshake state");

                    resetConnection(connection, connection.targetVip, STATE_HANDSHAKING)
                }else{
                    Log.debug(instanceId, "reliable-channel-status", "connection lost");

                    self.closeConnection(connection.targetVip);
                    return;
                }
            }

            if(invalidateConnectionCounter == 0) {
                Log.debug(instanceId, "reliable-channel-status", "re-invalidate connection");
                parentEndpoint.closeConnection(connection.targetVip);
            }

            Log.debug(instanceId, "reliable-channel-status", "connection refresh message sent")
            sendRefreshConnectionMessage(connection);
        }

        function onTimeEvent() {
            timerActive = false;
            var connectionsToDeactivate = [];

            var connections = self.getConnections();

            for(var i = 0; i < connections.length; i++) {
                refreshConnection(connections[i])
            }

            var currentTime = new Date().getTime();
            dropQueueNonEmpty = false;
            for(var droppedConnectionVip in dropParentConnectionQueue ) {
                dropQueueNonEmpty = true;

                if(self.getConnection(droppedConnectionVip) != null) {
                    delete dropParentConnectionQueue[droppedConnectionVip];
                }

                if(currentTime - dropParentConnectionQueue[droppedConnectionVip] > connectionLostTimeout) {
                    delete dropParentConnectionQueue[droppedConnectionVip];
                    parentEndpoint.closeConnection(droppedConnectionVip);
                }
            }

            resetTimer();
        }


        function resetTimer() {
            if(!timerActive && (dropQueueNonEmpty || self.getConnections().length > 0)) {
                timerActive = true;
                var nextInterval = heartbeatInterval * (1 + (Math.random() * 2 - 1) * heartbeatDeviation);
                window.setTimeout(onTimeEvent, nextInterval);
            }
        }

        var allowedMessageStates = {
            "HANDSHAKE":         {"NO-ACTION": true,  "HANDSHAKING": true,  "ACCEPTING": true,  "CONNECTED": false},
            "ACCEPT":            {"NO-ACTION": false, "HANDSHAKING": true,  "ACCEPTING": true,  "CONNECTED": true},
            "HEARTBEAT":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
            "MESSAGE":           {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": true},
            "CLOSE-CONNECTION":  {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true}
        };

        var verifyFromSid = {
            "HANDSHAKE":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
            "ACCEPT":            {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
            "HEARTBEAT":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
            "MESSAGE":           {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false},
            "CLOSE-CONNECTION":  {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true}
        };

        var verifyToSid = {
            "HANDSHAKE":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false},
            "ACCEPT":            {"NO-ACTION": false, "HANDSHAKING": true,  "ACCEPTING": true,  "CONNECTED": true},
            "HEARTBEAT":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true},
            "MESSAGE":           {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": true},
            "CLOSE-CONNECTION":  {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true}
        };

        function verifyIfPhantom(connection, message) {
            var messageType = message.type;
            var connectionState = connection.state;

            if(!allowedMessageStates[messageType][connectionState])
                return "Message type: '" + messageType + "' isn't allowed for channel state: '" + connectionState + "'";

            if(verifyFromSid[messageType][connectionState]) {
                if(connection.remoteSessionId != message.fromSid)
                    return "Message fromSid isn't the same to connection.remoteSessionId," +
                    " for messageType: '" + messageType + "' and connectionState: '"  + connectionState + "'";
            }

            if(verifyToSid[messageType][connectionState]) {
                if(connection.sessionId != message.toSid)
                    return "Message toSid isn't the same to connection.sessionId," +
                    " for messageType: '" + messageType + "' and connectionState: '"  + connectionState + "'";
            }

            return false;
        }

        function setConnectionState(connection, newState) {
            var instanceId = "reliable[" + endpointId + ":" + vip + "->" + connection.targetVip + "]";

            connection.state = newState;

            Log.debug(instanceId, "reliable-channel-status", "channel state changed to: " + connection.state);
        }


        function handleHandshakeMessage(event, connection, message) {
            if(  connection.state == STATE_NO_ACTION
              || connection.state == STATE_HANDSHAKING) {

                setConnectionState(connection, STATE_ACCEPTING);
                connection.remoteSessionId = message.fromSid;

                sendAcceptMessage(connection);
            }
        }

        function handleAcceptMessage(event, connection, message) {
            if(  connection.state == STATE_HANDSHAKING
              || connection.state == STATE_ACCEPTING) {

                setConnectionState(connection, STATE_CONNECTED);
                connection.remoteSessionId = message.fromSid;

                sendHeartbeatMessage(connection, 0, -1);

                self.__connectionOpened(connection.targetVip);
            }
        }

        function handleHeartbeatMessage(event, connection, message) {
            if(connection.state == STATE_CONNECTED) {
                var prevHeartBeatRequest = connection.lastHeartbeatRequest;
                connection.lastHeartbeatRequest = message.gapBegin;

                // performance optimization - to not flood the network
                // to avoid double sending of message, responding to gap only after second heartbeat
                // due to network latencies heartbeat can be out-dated, while message is delivered
                if(message.gapEnd == -1 && prevHeartBeatRequest != message.gapBegin) {
                    return;
                }

                // removing messages before gapBegin in sent buffer
                var sentMessages = connection.sentMessages;
                if(connection.firstMessageNumberInSendBuffer < message.gapBegin) {
                    sentMessages.removeFirst(message.gapBegin - connection.firstMessageNumberInSendBuffer);
                    connection.firstMessageNumberInSendBuffer = message.gapBegin;
                }


                var array = sentMessages.array;
                for(var i = 0; i < sentMessages.length; i++) {
                    if(message.gapEnd != -1 && message.gapEnd < i + message.gapBegin) {
                        break;
                    }

                    var gapMessage = array[(i + sentMessages.beginPointer) % array.length];

                    if(gapMessage) {
                        sendDataMessage(connection, i + message.gapBegin, gapMessage);
                    }
                }
            }

            if(connection.state == STATE_ACCEPTING) {
                setConnectionState(connection, STATE_CONNECTED);
                connection.remoteSessionId = message.fromSid;

                self.__connectionOpened(connection.targetVip)

                return;
            }
        }

        function handleDataMessage(event, connection, message) {
            var receivedMessages = connection.receivedMessages;

            if(message.messageIndex == connection.firstMessageNumberInReceivedBuffer + 1) {
                if(self.onMessage) {
                    self.onMessage({
                        message: message.payload,
                        sourceVip: event.sourceVip,
                        endpoint: self
                    });
                }
            }else {
                if(message.messageIndex > connection.firstMessageNumberInReceivedBuffer) {
                    receivedMessages.setValue(message.messageIndex - connection.firstMessageNumberInReceivedBuffer - 2, message);
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

            connection.firstMessageNumberInReceivedBuffer += processedMessages;
            receivedMessages.removeFirst(processedMessages);
        }

        function handleCloseMessage(event, connection, message) {
            if(connection.state == STATE_CONNECTED) {
                connection.closeConnectionHandled = true;
                self.closeConnection(connection.targetVip);
                return;
            }
        }

        var handlers = {
            "HANDSHAKE": handleHandshakeMessage,
            "ACCEPT":    handleAcceptMessage,
            "HEARTBEAT": handleHeartbeatMessage,
            "MESSAGE":   handleDataMessage,

            "CLOSE-CONNECTION": handleCloseMessage
        }


        this.setEndpointId = function(value) {
            endpointId = value;
        }

        parentEndpoint.onMessage = function(event) {
            if(self.isDestroyed()) {
                console.debug("ReliableHub: Unable to handle message, because endpoint is destroyed");
            }

            //Log.debug(self.vip, "reliable-hub", "onMessage: " + JSON.stringify(event));

            var message = ReliableMessageSerializer.deserialize(event.message);

            var connection = self.__lazyNewConnection(event.sourceVip);
            if(!connection.state) {
                resetConnection(connection, event.sourceVip, STATE_NO_ACTION);
            }

            var handler = handlers[message.type];

            if(!handler) {
                throw new Error("ReliableHub: Unknown message type received: " + message.type);
            }

            var phantomError = verifyIfPhantom(connection, message);
            if(phantomError) {
                Log.warn("reliable-hub", ["Phantom detected: " + phantomError,  event, connection])
                return;
            }

            connection.silenceCounter = 0;

            handler(event, connection, message);
        }

        self.__doOpenConnection = function(connection) {
            parentEndpoint.openConnection(connection.targetVip, function(event) {
                if(event.status  == Global.FAILED) {
                    self.__connectionOpenFailed(connection.targetVip);
                    return;
                }

                resetConnection(connection, event.targetVip, STATE_HANDSHAKING);
                sendHandshakeMessage(connection);
            })
        }

        self.__doSend = function(connection, message) {
            connection.lastSentMessageNumber++;
            connection.sentMessages.push(message);

            sendDataMessage(connection, connection.lastSentMessageNumber, message)
        }

        var __superDoReleaseConnection = self.__doReleaseConnection;
        self.__doReleaseConnection = function(connection) {
            if(!connection.closeConnectionHandled && connection.state == STATE_CONNECTED) {
                sendCloseConnectionMessage(connection);
            }

            dropQueueNonEmpty = true;
            dropParentConnectionQueue[connection.targetVip] = new Date().getTime();
        }
    }
}
