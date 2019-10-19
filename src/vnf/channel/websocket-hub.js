import {Log}           from "../../utils/logger.js";

import {Global} from "../global.js";

import {WebSocketRpc} from "../websocket/websocket-rpc.js";

import {VnfHub} from "./base/vnf-hub.js";

export function WebSocketHub(webSocketFactory){
    var selfHub = this;

    VnfHub.call(selfHub);

    var resendHandshakeInterval = 3000;
    var resendHandshakeRetries = 2;

    var rpcBusyTimerInterval = null;
    var rpcIdleTimerInterval = null;
    var rpcLoginRecreateInterval = null;


    selfHub.setResendHandshakeInterval = function(value) {
        resendHandshakeInterval = value;
    }

    selfHub.setResendHandshakeRetries = function(value) {
        resendHandshakeRetries = value;
    }


    this.setRpcBusyTimerInterval = function(value) {
        rpcBusyTimerInterval = value;
    }

    this.setRpcIdleTimerInterval = function(value) {
        rpcIdleTimerInterval = value;
    }

    this.setRpcLoginRecreateInterval = function(value) {
        rpcLoginRecreateInterval = value;
    }

    selfHub.VnfEndpoint = function WebSocketEndpoint(selfVip) {
        var self = this;
        selfHub.BaseEndPoint.call(this, selfVip);

        var webSocketRpc = new WebSocketRpc(selfVip, webSocketFactory);
        webSocketRpc.allocateUsage();

        if(rpcBusyTimerInterval != null) webSocketRpc.setBusyTimerInterval(rpcBusyTimerInterval);
        if(rpcIdleTimerInterval != null) webSocketRpc.setIdleTimerInterval(rpcIdleTimerInterval);
        if(rpcLoginRecreateInterval != null) webSocketRpc.setLoginRecreateInterval(rpcLoginRecreateInterval);

        function sendHandshake(targetVip) {
            var connection = self.getConnection(targetVip);

            if(connection == null) {
                return;
            }

            if(!self.isConnected(targetVip)) {
                if(connection.retryAttempts-- == 0) {
                    if(!webSocketRpc.isConnected()) {
                        Log.warn("websocket-hub", "No connection to websocket: Connection to other endpoint '"  + targetVip + "' failed ");
                    }

                    self.closeConnection(targetVip);
                    return;
                }


                webSocketRpc.invoke("SEND_TO_ENDPOINT",  targetVip + "\nHANDSHAKE", {retryResend: true})
                .catch((e) => Log.warn("websocket-hub", "SEND_TO_ENDPOINT HANDSHAKE not delivered: " + e));
                window.setTimeout(sendHandshake.bind(null, targetVip), resendHandshakeInterval);
            }
        }

        self.__doOpenConnection = function(connection) {
            connection.retryAttempts = resendHandshakeRetries;
            sendHandshake(connection.targetVip);
        }

        function handleHandshakeMessage(sourceVip, messageType, body) {
            var connection = self.__lazyNewConnection(sourceVip);

            webSocketRpc.invoke("SEND_TO_ENDPOINT",  connection.targetVip + "\nACCEPT", {retryResend: true})
            .catch((e) => Log.warn("websocket-hub", "SEND_TO_ENDPOINT ACCEPT not delivered: " + e));

            self.__connectionOpened(connection.targetVip);
        }

        function handleAcceptMessage(sourceVip, messageType, body) {
            var connection = self.__lazyNewConnection(sourceVip);
            self.__connectionOpened(connection.targetVip);
        }

        function handleMessage(sourceVip, messageType, body) {
            if(!self.isConnected(sourceVip)) {
                return false;
            }

            self.onMessage && self.onMessage({sourceVip: sourceVip,
                                              message:   body,
                                              endpoint:  self});
        }

        function handleCloseConnection(sourceVip, messageType, body) {
            var connection = self.getConnection(sourceVip);
            if(connection) connection.handlingCloseEvent = true;
            self.closeConnection(sourceVip);
        }

        var messageHandlers = {
            "HANDSHAKE":        handleHandshakeMessage,
            "ACCEPT":           handleAcceptMessage,
            "MESSAGE":          handleMessage,
            "CLOSE-CONNECTION": handleCloseConnection
        }

        self.getWebSocketRpc = function() {
          return webSocketRpc;
        }

        webSocketRpc.registerPushHandler("ENDPOINT_MESSAGE", function(event){
            var message = event.data;

            var endOfLine = message.indexOf("\n");

            var sourceVip;
            if(endOfLine == -1) {
                Log.warn("WebSocketHub: Malformed message retrieved. EOL character is required after endpoint\n" + message);
                return;
            }
            var sourceVip = message.substr(0, endOfLine);

            var beginOfLine = endOfLine + 1;
            endOfLine = message.indexOf("\n", beginOfLine);
            var messageType;
            var body;
            if(endOfLine == -1) {
                messageType = message.substr(beginOfLine);
                body = null;
            }else{
                messageType = message.substr(beginOfLine, endOfLine - beginOfLine);
                body = message.substr(endOfLine + 1);
            }

            var handler = messageHandlers[messageType];

            if(!handler) {
                throw new Error("WebSocketHub: Unexpected message type: '" + messageType + "'");
            }

            handler(sourceVip, messageType, body);
        })

        self.__doSend = function(connection, message) {
            webSocketRpc.invoke("SEND_TO_ENDPOINT",  connection.targetVip + "\nMESSAGE\n" + message, {retryResend: true})
            .then(function(event){
                if(event.data == Global.SEND_TO_ENDPOINT_RECIPIENT_ENDPOINT_CANNOT_BE_FOUND) {
                    self.closeConnection(connection.targetVip);
                }
            })
            .catch((e) => Log.warn("websocket-hub", "SEND_TO_ENDPOINT MESSAGE not delivered: " + e));
        };

        var parentDestroy = self.destroy;
        self.destroy = function() {
            parentDestroy();
            webSocketRpc.releaseUsage();
        };

        self.__doReleaseConnection = function(connection) {
            if(!connection.handlingCloseEvent) {
                webSocketRpc.invoke("SEND_TO_ENDPOINT",  connection.targetVip + "\nCLOSE-CONNECTION", {retryResend: true})
                .catch((e) => Log.warn("websocket-hub", "SEND_TO_ENDPOINT CLOSE-CONNECTION not delivered: " + e));
            }
        };
    };
};
