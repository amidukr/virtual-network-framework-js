import {Log}           from "../../utils/logger.js";

import {Global} from "../global.js";

import {WebSocketRpc} from "../websocket/websocket-rpc.js";

import {VnfHub} from "./base/vnf-hub.js";

export function WebSocketHub(webSocketFactory){
    var selfHub = this;

    VnfHub.call(selfHub);

    var rpcBusyTimerInterval = null;
    var rpcIdleTimerInterval = null;
    var rpcLoginRecreateInterval = null;

    this.setRpcBusyTimerInterval = function(value) {
        rpcBusyTimerInterval = value;
    }

    this.setRpcIdleTimerInterval = function(value) {
        rpcIdleTimerInterval = value;
    }

    this.setRpcLoginRecreateInterval = function(value) {
        rpcLoginRecreateInterval = value;
    }

    selfHub.VnfEndpoint = function WebSocketEndpoint(selfEva) {
        var self = this;
        selfHub.BaseEndPoint.call(this, selfEva);

        var webSocketRpc = new WebSocketRpc(selfEva, webSocketFactory);
        webSocketRpc.allocateUsage();

        if(rpcBusyTimerInterval != null) webSocketRpc.setBusyTimerInterval(rpcBusyTimerInterval);
        if(rpcIdleTimerInterval != null) webSocketRpc.setIdleTimerInterval(rpcIdleTimerInterval);
        if(rpcLoginRecreateInterval != null) webSocketRpc.setLoginRecreateInterval(rpcLoginRecreateInterval);

        self.__doOpenConnection_NextTry = function(connection) {
            connection.rpcInvokeFuture = webSocketRpc.invokeFuture("SEND_TO_ENDPOINT",  connection.targetEva + "\nHANDSHAKE", {retryResend: true});

            connection.rpcInvokeFuture.promise.then(function(e) {
                if(e.data) {
                    Log.debug("websocket-hub", "SEND_TO_ENDPOINT HANDSHAKE not delivered: " + e.data);
                    self.__connectionNextTryFailed(connection);
                }
            })
            .catch((e) => {
                Log.debug("websocket-hub", ["SEND_TO_ENDPOINT HANDSHAKE not delivered: ", e]);
                self.__connectionNextTryFailed(connection);
            });
        }

        self.__doOpenConnection_CleanBeforeNextTry = function(connection) {
            if(connection.rpcInvokeFuture) {
                connection.rpcInvokeFuture.cancel();
            }
        }

        self.__doReleaseConnection = function(connection) {
            self.__doOpenConnection_CleanBeforeNextTry(connection);

            if(!connection.handlingCloseEvent) {
                webSocketRpc.invoke("SEND_TO_ENDPOINT",  connection.targetEva + "\nCLOSE-CONNECTION", {retryResend: true})
                .catch((e) => Log.debug("websocket-hub", "SEND_TO_ENDPOINT CLOSE-CONNECTION not delivered: " + e));
            }
        };

        function handleHandshakeMessage(sourceEva, messageType, body) {
            if(self.isDestroyed()) return;

            webSocketRpc.invoke("SEND_TO_ENDPOINT",  sourceEva + "\nACCEPT", {retryResend: true})
            .catch((e) => Log.debug("websocket-hub", "SEND_TO_ENDPOINT ACCEPT not delivered: " + e));

            self.__acceptConnection(sourceEva);
        }

        function handleAcceptMessage(sourceEva, messageType, body) {
            var  connection  = self.getConnection(sourceEva);

            if(!connection) return;

            self.__connectionOpened(connection);
        }

        function handleMessage(sourceEva, messageType, body) {
            if(!self.isConnected(sourceEva)) {
                return false;
            }

            try{
                self.onMessage && self.onMessage({sourceEva: sourceEva,
                                                  message:   body,
                                                  endpoint:  self});
            }catch(e) {
                Log.error("websocket-hub", ["Error in onMessage handler: ", e]);
            }
        }

        function handleCloseConnection(sourceEva, messageType, body) {
            var connection = self.getConnection(sourceEva);
            if(connection) connection.handlingCloseEvent = true;
            self.closeConnection(sourceEva);
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

            var sourceEva;
            if(endOfLine == -1) {
                Log.debug("WebSocketHub: Malformed message retrieved. EOL character is required after endpoint\n" + message);
                return;
            }
            var sourceEva = message.substr(0, endOfLine);

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

            handler(sourceEva, messageType, body);
        })

        self.__doSend = function(connection, message) {
            webSocketRpc.invoke("SEND_TO_ENDPOINT",  connection.targetEva + "\nMESSAGE\n" + message, {retryResend: true})
            .then(function(event){
                if(event.data == Global.SEND_TO_ENDPOINT_RECIPIENT_ENDPOINT_CANNOT_BE_FOUND) {
                    self.closeConnection(connection.targetEva);
                }
            })
            .catch((e) => Log.debug("websocket-hub", "SEND_TO_ENDPOINT MESSAGE not delivered: " + e));
        };

        var parentDestroy = self.destroy;
        self.destroy = function() {
            parentDestroy();
            webSocketRpc.releaseUsage();
        };
    };
};
