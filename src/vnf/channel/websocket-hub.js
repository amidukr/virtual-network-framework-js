define(["utils/logger",
        "vnf/websocket/websocket-rpc",
        "vnf/channel/base/vnf-hub",
        "utils/vnf-serializer"],

function(Log,
         WebSocketRpc,
         VNFHub,
         VnfSerializer) {

    return function WebSocketHub(webSocketFactory){
        var selfHub = this;

        VNFHub.call(selfHub);

        selfHub.VNFEndpoint = function WebSocketEndpoint(selfVip) {
            var self = this;
            selfHub.BaseEndPoint.call(this, selfVip);

            var webSocketRpc = new WebSocketRpc(selfVip, webSocketFactory);

            var connected = {};

            function handleMessage(sourceVip, messageType, body) {
                connected[sourceVip] = true;

                self.onMessage && self.onMessage({sourceVIP: sourceVip,
                                                  message:   VnfSerializer.deserializeValue(body),
                                                  endpoint:  self});
            }

            function handleCloseConnection(sourceVip, messageType, body) {
                delete connected[sourceVip];
                self.__fireConnectionLost(sourceVip);
            }

            var messageHandlers = {
                "MESSAGE":          handleMessage,
                "CLOSE-CONNECTION": handleCloseConnection
            }

            self.setConnection = function(targetVip, endpoint) {
                connections[targetVip] = endpoint;
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

            self.send = function(vip, message) {
                if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

                connected[vip] = true;

                webSocketRpc.call("SEND_TO_ENDPOINT",  vip + "\nMESSAGE\n" + VnfSerializer.serializeValue(message), {retryResend: true});
            }

            var parentDestroy = self.destroy;
            self.destroy = function() {
                for(var remoteVip in connected){
                    if(connected[remoteVip]) {
                        try{
                            self.closeConnection(remoteVip);
                        }catch(e){
                            Log.error(selfVip, "in-browser-hub", ["Error closing connection", e]);
                        }
                    }
                }

                webSocketRpc.destroy();
                parentDestroy();
            }

            self.isConnected = function(targetVip) {
                return connected[targetVip];
            }

            self.closeConnection = function(targetVip) {
                if(!connected[targetVip]) return;

                delete connected[targetVip];
                self.__fireConnectionLost.bind(null, targetVip);

                webSocketRpc.call("SEND_TO_ENDPOINT",  targetVip + "\nCLOSE-CONNECTION", {retryResend: true});
            }
        }
    };
});

