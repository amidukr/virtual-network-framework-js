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
var STATE_CLOSED      = 'CLOSED';

var MESSAGE_HANDSHAKE    = 'HANDSHAKE';
var MESSAGE_ACCEPT       = 'ACCEPT';
var MESSAGE_DATA         = 'MESSAGE';
var MESSAGE_HEARTBEAT    = 'HEARTBEAT';
var MESSAGE_CLOSE_CONNECTION  = 'CLOSE-CONNECTION';
var MESSAGE_CLOSE_ACCEPT = 'CLOSE-ACCEPT';


export function ReliableHub(hub) {
    var selfHub = this;

    ProxyHub.call(selfHub, hub);

    if(!hub) {
        throw new Error("Unable to create instance of ReliableHub, argument 'hub' cannot be null");
    }

    var heartbeatInterval = 1000;
    var connectionInvalidateInterval = 50000;
    var connectionLostTimeout = 15000;

    var heartbeatsToInvalidate = 0;
    var heartbeatsToDropConnection = 0;

    var heartbeatDeviation = 0.3;

    selfHub.setEstablishConnectionTimeout = function(value) {
        Log.warn("reliable-hub", "ReliableHub do not support setEstablishConnectionTimeout, please use ReliableHub heartbeat specific configure");
    }

    selfHub.setRetryConnectAfterDelay = function(value) {
        Log.warn("reliable-hub", "ReliableHub do not support setEstablishConnectionTimeout, please use ReliableHub heartbeat specific configure");
    }

    selfHub.setOpenConnectionRetries = function(value) {
        Log.warn("reliable-hub", "ReliableHub do not support setEstablishConnectionTimeout, please use ReliableHub heartbeat specific configure");
    }


    function updateHeartbeatCounters() {
        heartbeatsToInvalidate     = Math.round(connectionInvalidateInterval / heartbeatInterval);
        heartbeatsToDropConnection = Math.round(connectionLostTimeout        / heartbeatInterval);
    }

    updateHeartbeatCounters();

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

    selfHub.VnfEndpoint = function ReliableEndpoint(eva) {
        var self = this;
        selfHub.ProxyEndpoint.call(self, eva);

        var parentEndpoint = self.parentEndpoint;
        var endpointId = Random.random6();

        var nextSessionIndex = 1;
        var timerActive = false;

        var dropQueueNonEmpty = false;
        var dropParentConnectionQueue = {}

        function resetConnection(connection, targetEva, state) {
            connection.targetEva = targetEva;
            connection.sessionIndex = nextSessionIndex++;
            connection.sessionId = endpointId + "-" + connection.sessionIndex;

            connection.silenceCounter = 0;

            connection.lastHeartbeatRequest = -1;

            connection.lastSentMessageNumber = -1;

            connection.firstMessageNumberInSendBuffer = 0;
            connection.sentMessages = new CycleBuffer();

            connection.firstMessageNumberInReceivedBuffer = -1;
            connection.receivedMessages = new CycleBuffer();

            connection.beatCloseConnection = true;

            setConnectionState(connection, state);

            resetTimer();
        }

        function parentSend(targetEva, messageJson) {
            try{
                var messageString = ReliableMessageSerializer.serialize(messageJson);
                parentEndpoint.send(targetEva, messageString);
            }catch(error) {
                Log.debug(self.eva, "reliable-hub", ["Unable to send message: ", error]);
            }
        }

        function parentOpenConnection(targetEva) {
            if(parentEndpoint.isConnected(targetEva)) {
                return;
            }

            if(!self.getConnection(targetEva)) {
                return;
            }

            parentEndpoint.openConnection(targetEva, function(e) {
                if(e.status == Global.FAILED) {
                    parentOpenConnection(targetEva);
                }
            });
        }

        function parentConnectionClose(targetEva) {
            parentEndpoint.closeConnection(targetEva);
        }

        parentEndpoint.onConnectionOpen(function onConnectionOpen(targetEva) {
            var connection = self.getConnection(targetEva);
            if(!connection) {
                connection = dropParentConnectionQueue[targetEva]
            }

            if(!connection) {
                return;
            }

            sendRefreshConnectionMessage(connection);
        });

        parentEndpoint.onConnectionLost(function onConnectionLost(targetEva) {
            parentOpenConnection(targetEva);
        });


        function sendHandshakeMessage(connection) {
            parentSend(connection.targetEva, {type:    MESSAGE_HANDSHAKE,
                                              fromSid: connection.sessionId});
        }

        function sendAcceptMessage(connection) {
            parentSend(connection.targetEva, {type:      MESSAGE_ACCEPT,
                                              fromSid:   connection.sessionId,
                                              toSid:     connection.remoteSessionId});
        }

        function sendHeartbeatMessage(connection, gapBegin, gapEnd) {
            parentSend(connection.targetEva, {type:      MESSAGE_HEARTBEAT,
                                              fromSid:   connection.sessionId,
                                              toSid:     connection.remoteSessionId,
                                              gapBegin:  gapBegin,
                                              gapEnd:    gapEnd});
        }

        function sendDataMessage(connection, messageIndex, message) {
            parentSend(connection.targetEva, {type: MESSAGE_DATA,
                                              toSid: connection.remoteSessionId,
                                              messageIndex: messageIndex,
                                              payload: message})
        }

        function sendCloseConnectionMessage(connection) {
            parentSend(connection.targetEva, {type: MESSAGE_CLOSE_CONNECTION,
                                              toSid: connection.remoteSessionId,
                                              fromSid: connection.sessionId})
        }

        function sendCloseAcceptMessage(targetEva, toSid, fromSid) {
            parentSend(targetEva, {type: MESSAGE_CLOSE_ACCEPT,
                                   toSid: toSid,
                                   fromSid: fromSid})
        }

        function sendRefreshConnectionMessage(connection) {
            if(!parentEndpoint.isConnected(connection.targetEva)) {
                Log.debug(instanceId, "send-refresh-connection-message", "Unable to send refresh message since parent connection is closed, connection.state = " +  connection.state);
                return;
            }

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

            if(connection.state == STATE_CLOSED) {
                sendCloseConnectionMessage(connection);
                return;
            }

            if(connection.state == STATE_NO_ACTION) {
                  return;
            }

            var instanceId = "reliable[" + endpointId + ":" + eva + "->" + connection.targetEva + "]";
            Log.error(instanceId, "send-refresh-connection-message", "Unexpected connection state: '" + connection.state + "'");
        }

        function refreshConnection(connection) {

            if(connection.targetEva == self.eva) {
                return;
            }

            connection.silenceCounter++;

            var invalidateConnectionCounter = connection.silenceCounter % heartbeatsToInvalidate;

            var instanceId = "reliable[" + endpointId + ":" + eva + "->" + connection.targetEva + "]";

            Log.verbose(instanceId, "reliable-channel-status",
              "connection-invalidate: " + invalidateConnectionCounter + "/" + heartbeatsToInvalidate + "; "
            + "connection-keep-alive: " + connection.silenceCounter   + "/" + heartbeatsToDropConnection);



            if(connection.silenceCounter >= heartbeatsToDropConnection) {
                if(connection.state == STATE_ACCEPTING && connection.callback != null) {
                    Log.verbose(instanceId, "reliable-channel-status", "fallback to handshake state");

                    resetConnection(connection, connection.targetEva, STATE_HANDSHAKING)
                }else{
                    Log.verbose(instanceId, "reliable-channel-status", "connection lost");

                    self.closeConnection(connection.targetEva);
                    return;
                }
            }

            if(invalidateConnectionCounter == 0 && connection.state != STATE_NO_ACTION) {
                Log.verbose(instanceId, "reliable-channel-status", "re-invalidate connection");
                parentConnectionClose(connection.targetEva);
                parentOpenConnection(connection.targetEva);
            }

            Log.verbose(instanceId, "reliable-channel-status", "connection refresh message sent")
            sendRefreshConnectionMessage(connection);
        }

        function refreshDroppedConnection(droppedConnectionEva) {
            var connection = dropParentConnectionQueue[droppedConnectionEva];

            connection.dropConnectionCounter--;

            var newConnection = self.getConnection(droppedConnectionEva);

            if(newConnection && newConnection.state != STATE_NO_ACTION) {
                delete dropParentConnectionQueue[droppedConnectionEva];
                return;
            }

            if(connection.beatCloseConnection && parentEndpoint.isConnected(droppedConnectionEva)) {
                sendCloseConnectionMessage(connection);
            }

            if(connection.dropConnectionCounter <= 0) {
                delete dropParentConnectionQueue[droppedConnectionEva];

                if(!newConnection) {
                    parentConnectionClose(droppedConnectionEva);
                }
            }
        }

        function onTimeEvent() {
            timerActive = false;
            if(self.isDestroyed()) {
                return;
            }

            var connectionsToDeactivate = [];

            var connections = self.getConnections();

            for(var i = 0; i < connections.length; i++) {
                refreshConnection(connections[i])
            }

            dropQueueNonEmpty = false;
            for(var droppedConnectionEva in dropParentConnectionQueue ) {
                dropQueueNonEmpty = true;
                refreshDroppedConnection(droppedConnectionEva);
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
            "HANDSHAKE":         {"NO-ACTION": true,  "HANDSHAKING": true,  "ACCEPTING": true,  "CONNECTED": false, "CLOSED": false},
            "ACCEPT":            {"NO-ACTION": false, "HANDSHAKING": true,  "ACCEPTING": true,  "CONNECTED": true,  "CLOSED": false},
            "HEARTBEAT":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true,  "CLOSED": false},
            "MESSAGE":           {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": true,  "CLOSED": false},
            "CLOSE-CONNECTION":  {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true,  "CLOSED": false},
            "CLOSE-ACCEPT":      {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false, "CLOSED": true}
        };

        var verifyFromSid = {
            "HANDSHAKE":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true,  "CLOSED": false},
            "ACCEPT":            {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true,  "CLOSED": false},
            "HEARTBEAT":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true,  "CLOSED": false},
            "MESSAGE":           {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false, "CLOSED": false},
            "CLOSE-CONNECTION":  {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true,  "CLOSED": false},
            "CLOSE-ACCEPT":      {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false, "CLOSED": true}
        };

        var verifyToSid = {
            "HANDSHAKE":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false, "CLOSED": false},
            "ACCEPT":            {"NO-ACTION": false, "HANDSHAKING": true,  "ACCEPTING": true,  "CONNECTED": true,  "CLOSED": false},
            "HEARTBEAT":         {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": true,  "CONNECTED": true,  "CLOSED": false},
            "MESSAGE":           {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": true,  "CLOSED": false},
            "CLOSE-CONNECTION":  {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": true,  "CLOSED": false},
            "CLOSE-ACCEPT":      {"NO-ACTION": false, "HANDSHAKING": false, "ACCEPTING": false, "CONNECTED": false, "CLOSED": true}
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
            var instanceId = "reliable[" + endpointId + ":" + eva + "->" + connection.targetEva + "]";

            connection.state = newState;

            Log.verbose(instanceId, "reliable-channel-status", "channel state changed to: " + connection.state);
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

                self.__connectionOpened(connection);
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

                self.__connectionOpened(connection)

                return;
            }
        }

        function handleDataMessage(event, connection, message) {
            var receivedMessages = connection.receivedMessages;

            if(message.messageIndex == connection.firstMessageNumberInReceivedBuffer + 1) {
                try {
                    self.onMessage && self.onMessage({
                                            message: message.payload,
                                            sourceEva: event.sourceEva,
                                            endpoint: self
                    });
                }catch(e) {
                    Log.error(self.eva, "reliable-hub", ["Error in onMessage handler: ", e]);
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
                try {
                    self.onMessage&& self.onMessage({
                        message: message.payload,
                        sourceEva: event.sourceEva,
                        endpoint: self
                    });
                }catch(e) {
                    Log.error(self.eva, "reliable-hub", ["Error in onMessage handler: ", e]);
                }
            }

            connection.firstMessageNumberInReceivedBuffer += processedMessages;
            receivedMessages.removeFirst(processedMessages);
        }

        function handleCloseMessage(event, connection, message) {
            if(connection.state == STATE_CONNECTED) {
                connection.beatCloseConnection = false;
                self.closeConnection(connection.targetEva);
                return;
            }
        }

        function handleCloseAcceptMessage(event, connection, message) {
            connection.beatCloseConnection = false;
        }

        var handlers = {
            "HANDSHAKE": handleHandshakeMessage,
            "ACCEPT":    handleAcceptMessage,
            "HEARTBEAT": handleHeartbeatMessage,
            "MESSAGE":   handleDataMessage,

            "CLOSE-CONNECTION": handleCloseMessage,
            "CLOSE-ACCEPT": handleCloseAcceptMessage
        }


        this.setEndpointId = function(value) {
            endpointId = value;
        }

        parentEndpoint.onMessage = function handleMessage(event) {
            if(self.isDestroyed()) {
                Log.verbose("reliable-hub", "ReliableHub: Unable to handle message, because endpoint is destroyed")
            }

            //Log.verbose(self.eva, "reliable-hub", "onMessage: " + JSON.stringify(event));

            var message = ReliableMessageSerializer.deserialize(event.message);

            if(message.type == MESSAGE_CLOSE_CONNECTION) {
                sendCloseAcceptMessage(event.sourceEva, message.fromSid, message.toSid);
            }

            var handler = handlers[message.type];

            if(!handler) {
                throw new Error("ReliableHub: Unknown message type received: " + message.type);
            }

            var connection;
            if(message.type == MESSAGE_CLOSE_ACCEPT && dropParentConnectionQueue[event.sourceEva]) {
                connection = dropParentConnectionQueue[event.sourceEva];
            }else{
                connection = self.__lazyNewConnection(event.sourceEva);
                if(!connection.state) {
                    resetConnection(connection, event.sourceEva, STATE_NO_ACTION);
                }
            }

            var phantomError = verifyIfPhantom(connection, message);
            if(phantomError) {
                Log.debug("reliable-hub", ["Phantom detected: " + phantomError,  event, connection]);
                return;
            }

            connection.silenceCounter = 0;

            handler(event, connection, message);
        }

        self.__doOpenConnection = function(connection) {
            resetConnection(connection, connection.targetEva, STATE_HANDSHAKING);
            parentOpenConnection(connection.targetEva);

            if(parentEndpoint.isConnected(connection.targetEva)) {
                sendRefreshConnectionMessage(connection);
            }
        }

        self.__doOpenConnectionRetryLoop = function(connection) {}

        self.__doSend = function(connection, message) {
            connection.lastSentMessageNumber++;
            connection.sentMessages.push(message);

            sendDataMessage(connection, connection.lastSentMessageNumber, message)
        }

        var __superDoReleaseConnection = self.__doReleaseConnection;
        self.__doReleaseConnection = function(connection) {
            if(connection.state == STATE_NO_ACTION && !dropParentConnectionQueue[connection.targetEva] && !self.getConnection(connection.targetEva)) {
                parentConnectionClose(connection.targetEva);
            }

            if(connection.state == STATE_NO_ACTION) {
                setConnectionState(connection, STATE_CLOSED);
                return;
            }

            if(connection.beatCloseConnection) {
                sendCloseConnectionMessage(connection);
            }
            setConnectionState(connection, STATE_CLOSED);

            dropQueueNonEmpty = true;
            connection.dropConnectionCounter = heartbeatsToDropConnection;
            dropParentConnectionQueue[connection.targetEva] = connection;
        }
    }
}
