define(["utils/logger",
        "vnf/websocket/websocket-rpc",
        "vnf/channel/base/vnf-hub",
        "utils/vnf-serializer"],

function(Log,
         WebSocketRpc,
         VnfHub,
         VnfSerializer) {

    return function WebSocketHub(webSocketFactory){
        var selfHub = this;

        VnfHub.call(selfHub);

        selfHub.VnfEndpoint = function WebSocketEndpoint(selfVip) {
            var self = this;
            selfHub.BaseEndPoint.call(this, selfVip);
            var resendHandshakeInterval = 3000;

            var webSocketRpc = new WebSocketRpc(selfVip, webSocketFactory);

            function sendHandshake(targetVip) {
                var connection = self.getConnection(targetVip);

                if(connection == null) {
                    return;
                }

                if(!self.isConnected(targetVip)) {
                    if(connection.retryAttempts-- == 0) {
                        self.closeConnection(targetVip);
                        return;
                    }


                    webSocketRpc.invoke("SEND_TO_ENDPOINT",  targetVip + "\nHANDSHAKE", {retryResend: true});
                    window.setTimeout(sendHandshake.bind(null, targetVip), resendHandshakeInterval);
                }
            }

            self.setResendHandshakeInterval = function(value) {
                resendHandshakeInterval = value;
            }

            self.__doOpenConnection = function(connection) {
                connection.retryAttempts = 2;
                sendHandshake(connection.targetVip);
            }

            function handleHandshakeMessage(sourceVip, messageType, body) {
                var connection = self.__lazyNewConnection(sourceVip);
                self.__connectionOpened(connection.targetVip);

                webSocketRpc.invoke("SEND_TO_ENDPOINT",  connection.targetVip + "\nACCEPT", {retryResend: true});
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
                if(endOfLine == -1) throw new Error("WebSocketHub: Malformed message retrieved. EOL character is required after endpoint");
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
                    if(event.data == "ENDPOINT_NOT_FOUND") {
                        self.closeConnection(connection.targetVip);
                    }
                });
            };

            var parentDestroy = self.destroy;
            self.destroy = function() {
                parentDestroy();
                webSocketRpc.destroy();
            };

            self.__doReleaseConnection = function(connection) {
                webSocketRpc.invoke("SEND_TO_ENDPOINT",  connection.targetVip + "\nCLOSE-CONNECTION", {retryResend: true});
            };
        };
    };
});

