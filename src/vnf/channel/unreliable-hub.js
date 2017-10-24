define(["utils/logger", "vnf/channel/base/vnf-proxy-hub", "vnf/global"], function(Log, ProxyHub, Global) {

    return function UnreliableHub(hub) {
        var selfHub = this;

        ProxyHub.call(selfHub, hub);

        var blockedChannels = {};

        selfHub.VnfEndpoint = function UnreliableEndpoint(selfVip) {
            var self = this;
            selfHub.ProxyEndpoint.call(self, selfVip);

            self.parentEndpoint.onMessage = function(event) {
                var connection = self.__lazyNewConnection(event.sourceVip);
                self.__connectionOpened(connection.targetVip)

                if(self.onMessage) {
                    self.onMessage({
                        message:   event.message,
                        sourceVip: event.sourceVip,
                        endpoint:   self
                    });
                }
            }

            self.__doOpenConnection = function(connection) {
                self.parentEndpoint.openConnection(connection.targetVip, function(event) {
                    if(event.status  == Global.FAILED) {
                        self.__connectionOpenFailed(connection.targetVip);
                    }else{
                        self.__connectionOpened(connection.targetVip)
                    }
                })
            }

            self.__doSend = function(connection, message) {
                if(blockedChannels[self.vip] && blockedChannels[self.vip][vip]) {
                    return;
                }

                self.parentEndpoint.send(connection.targetVip, message);
            }

            self.parentEndpoint.onConnectionLost(function(targetVip){
                self.closeConnection(targetVip);
            });
        }

        selfHub.blockChannel = function(fromVip1, toVip2) {
            if(!blockedChannels[fromVip1]){
                blockedChannels[fromVip1] = {};
            }

            blockedChannels[fromVip1][toVip2] = true;
        }

        selfHub.unblockChannel = function(fromVip1, toVip2) {
            if(blockedChannels[fromVip1]){
                blockedChannels[fromVip1][toVip2] = false;
            }
        }
    }
});