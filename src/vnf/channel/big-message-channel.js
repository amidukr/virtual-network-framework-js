define(["utils/logger", "utils/xtimeout.js", "vnf/channel/base/vnf-proxy-hub", "vnf/global"], function(Log, xTimeout, ProxyHub, Global) {
    var DEFAULT_FRAGMENT_SIZE = 64*1024;

    function BigMessageHub(parentHub, configuration){
        var selfHub = this;
        ProxyHub.call(selfHub, parentHub);
        
        configuration = configuration || {}
        var fragmentSize = configuration.fragmentSize || DEFAULT_FRAGMENT_SIZE;

        selfHub.VnfEndpoint = function BigMessageEndpoint(selfVip) {
            var self = this;
            selfHub.ProxyEndpoint.call(self, selfVip);
            
            var parentEndpoint = self.parentEndpoint;

            parentEndpoint.onConnectionOpen(function(targetVip){
                self.__connectionOpened(targetVip);
            })

            parentEndpoint.onConnectionLost(function(targetVip){
                self.closeConnection(targetVip);
            });

            parentEndpoint.onMessage = function(event) {
                var connection = self.__lazyNewConnection(event.sourceVip);

                var message = event.message;

                var messageLen = connection.messageLen;

                if(messageLen == null) {
                    // First fragment of new message
                    connection.messageType = message.substr(0, 1);
                    var lenDigit = message.substr(1, 1) - 0;
                    connection.messageLen = message.substr(2, lenDigit) - 0;
                    connection.messageFragment = message.substr(2 + lenDigit);

                    messageLen = connection.messageLen;
                } else {
                    connection.messageFragment += message;
                }

                var messageFragment = connection.messageFragment;

                if(messageFragment.length == messageLen) {
                    connection.messageLen = null;

                    var message = connection.messageType == "J" ? JSON.parse(messageFragment) : messageFragment;

                    var onMessage = self.onMessage;
                    onMessage && onMessage({message: message,
                                            sourceVip: event.sourceVip,
                                            endpoint: self});

                    connection.messageFragment = null;
                    connection.messageType = null;
                }
            }

            self.__doOpenConnection = function(connection) {
                parentEndpoint.openConnection(connection.targetVip, function(event) {
                    if(event.status  == Global.FAILED) {
                        self.__connectionOpenFailed(connection.targetVip);
                    }else{
                        self.__connectionOpened(connection.targetVip);
                    }
                })
            }

            self.__doSend = function(connection, message) {
                var messageData;
                var messageType;

                if(typeof message == "string") {
                    messageData = message;
                    messageType = "S";
                }else{
                    messageData = JSON.stringify(message);
                    messageType = "J";
                }

                var msgLen = messageData.length + "";
                var lenDigit = msgLen.length + "";
                if(lenDigit.length > 1) {
                    throw new Error("Message length to big: " + msgLen);
                }

                var position = 0;

                while(position < msgLen) {
                    var msgChunk = messageData.substr(position, fragmentSize);
                    var fragment = position == 0 ? messageType + lenDigit + msgLen +  msgChunk : msgChunk;
                    parentEndpoint.send(connection.targetVip, fragment);
                    position += msgChunk.length;
                }
            }

        };
    }

    return BigMessageHub;
})