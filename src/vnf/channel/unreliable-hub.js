define(["utils/logger", "vnf/channel/base/vnf-proxy-hub"], function(Log, ProxyHub) {

    return function UnreliableHub(hub) {
        var selfHub = this;

        ProxyHub.call(selfHub, hub);

        var blockedChannels = {};

        selfHub.VnfEndpoint = function UnreliableEndpoint(selfVip) {
            var self = this;
            selfHub.ProxyEndpoint.call(self, selfVip);

            self.parentEndpoint.onMessage = function(event) {
                if(self.onMessage) {
                    self.onMessage({
                        message:   event.message,
                        sourceVIP: event.sourceVIP,
                        endpoint:   self
                    });
                }
            }

            self.send = function(vip, message) {
                if(blockedChannels[self.vip] && blockedChannels[self.vip][vip]) {
                    return;
                }

                self.parentEndpoint.send(vip, message);
            }

            self.isConnected = function(targetVip) {
                 return self.parentEndpoint.isConnected(targetVip);
            }

            self.parentEndpoint.onConnectionLost(function(targetVIP){
                self.__fireConnectionLost(targetVIP);
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