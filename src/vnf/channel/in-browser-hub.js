define(["utils/logger", "vnf/channel/base/vnf-hub"], function(Log, VNFHub) {

   return function InBrowserHub(){
      var selfHub = this;

      VNFHub.call(selfHub);


      selfHub.VNFEndpoint = function InBrowserEndpoint(selfVip) {
         var self = this;
         selfHub.BaseEndPoint.call(this, selfVip);

         self.send = function(vip, message) {
             if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

             window.setTimeout(function inBrowserSend() {
                 var endpoint = selfHub.getEndPoint(vip);
                 var handler = endpoint && endpoint.onMessage;
                 if(handler) {
                    handler({sourceVIP: selfVip, message: message, endpoint: endpoint});
                 }
             }, 0)
         }

         self.invalidate = function(){}
      }
   };
});


