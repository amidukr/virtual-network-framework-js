define(["utils/logger", "vnf/channel/base/vnf-hub"], function(Log, VnfHub) {
    return function ProxyHub(parentHub){
        var selfHub = this;

        if(!parentHub) {
            throw new Error("Unable to create instnce of ProxyHub, argument 'parentHub' shouldn't be null");
        }

        VnfHub.call(selfHub);

        selfHub.ProxyEndpoint = function InBrowserEndpoint(selfVip) {
            var self = this;
            selfHub.BaseEndPoint.call(this, selfVip);

            self.parentEndpoint = parentHub.openEndpoint(selfVip);

            self.onDestroy(function(){
                if(self.parentEndpoint) {
                    self.parentEndpoint.destroy();
                }
            });

            self.closeConnection = function(targetVIP) {
                if(self.parentEndpoint) {
                    self.parentEndpoint.closeConnection(targetVIP);
                }
            };
        }
    };
});