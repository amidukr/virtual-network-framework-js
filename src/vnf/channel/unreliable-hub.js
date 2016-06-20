define(["utils/logger"], function(Log) {

    return function UnreliableHub(hub) {
        var self = this;

        if(!hub) {
            throw new Error("Unable to create instnce of UnreliableHub, argument 'hub' cannot be null");
        }

        var hubMap = {};
        var blockedChannels = {};

        function ProxyEndpoint(vip) {
            var parentEndpoint = hub.openEndpoint(vip);
            var self = this;

            self.vip = vip;

            parentEndpoint.onMessage = function(event) {
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

                parentEndpoint.send(vip, message);
            }

        }

        self.blockChannel = function(fromVip1, toVip2) {
            if(!blockedChannels[fromVip1]){
                blockedChannels[fromVip1] = {};
            }

            blockedChannels[fromVip1][toVip2] = true;
        }

        self.unblockChannel = function(fromVip1, toVip2) {
            if(blockedChannels[fromVip1]){
                blockedChannels[fromVip1][toVip2] = false;
            }
        }

        self.openEndpoint = function(vip) {
            var endpoint = hubMap[vip];
                  if(!endpoint) {
                      endpoint = new ProxyEndpoint(vip);
                      hubMap[vip] = endpoint;
                  }

            return endpoint;
        }
    }
});