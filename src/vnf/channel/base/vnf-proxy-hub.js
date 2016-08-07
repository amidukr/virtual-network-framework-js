define(["utils/logger", "vnf/channel/base/vnf-hub"], function(Log, VNFHub) {
    return function ProxyHub(parentHub){
        var selfHub = this;

        if(!parentHub) {
            throw new Error("Unable to create instnce of ProxyHub, argument 'parentHub' shouldn't be null");
        }

        VNFHub.call(selfHub);

        selfHub.ProxyEndpoint = function InBrowserEndpoint(selfVip) {
            var self = this;
            selfHub.BaseEndPoint.call(this, selfVip);

            self.parentEndpoint = parentHub.openEndpoint(selfVip);

            var parentDestroy = self.destroy;
            self.destroy = function() {
                parentDestroy();

                if(self.parentEndpoint) {
                    self.parentEndpoint.destroy();
                }
            }

            self.invalidate = function(targetVIP) {
                if(self.parentEndpoint) {
                    self.parentEndpoint.invalidate(targetVIP);
                }
            }
        }
    };
});