define(["utils/logger", "vnf/channel/base/vnf-hub"], function(Log, VnfHub) {

    return function InBrowserHub(){
        var selfHub = this;

        VnfHub.call(selfHub);

        selfHub.VnfEndpoint = function InBrowserEndpoint(selfVip) {
            var self = this;
            selfHub.BaseEndPoint.call(this, selfVip);

            self.__doOpenConnection = function(connection) {
                window.setTimeout(function(){
                    var remoteEndpoint = selfHub.getEndPoint(connection.targetVip);

                    if(remoteEndpoint) {

                        connection.remoteEndpoint = remoteEndpoint;

                        var remoteConnection = remoteEndpoint.__lazyNewConnection(selfVip);
                        remoteConnection.remoteEndpoint = self;
                        remoteEndpoint.__connectionOpened(selfVip);

                        self.__connectionOpened(connection.targetVip);
                    }else{
                        self.__connectionOpenFailed(connection.targetVip);
                    }
                }, 0);

            }

            self.__doSend = function(connection, message) {
                window.setTimeout(function inBrowserSend() {
                if(self.isDestroyed()) return;
                    if(!connection.isConnected) return;

                    var remoteEndpoint = connection.remoteEndpoint;
                    var onMessage = remoteEndpoint.onMessage;
                    if(onMessage) {
                        onMessage({sourceVip: selfVip, message: message, endpoint: remoteEndpoint});
                    }

                }, 0);
            }

            self.__doReleaseConnection = function(connection) {
                 var remoteEndpoint = connection.remoteEndpoint;
                 if(remoteEndpoint) {
                    window.setTimeout(remoteEndpoint.closeConnection.bind(null, selfVip), 0);
                 }
            }
        }
    };
});

