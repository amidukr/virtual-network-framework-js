define(["utils/logger", "vnf/channel/base/vnf-hub"], function(Log, VNFHub) {

   return function InBrowserHub(){
      var selfHub = this;

      VNFHub.call(selfHub);

      selfHub.VNFEndpoint = function InBrowserEndpoint(selfVip) {
         var self = this;
         selfHub.BaseEndPoint.call(this, selfVip);

         self.__connections = {};

         self.send = function(vip, message) {
             if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

             self.__connections[vip] = true;

             window.setTimeout(function inBrowserSend() {
                 var endpoint = selfHub.getEndPoint(vip);
                 var handler = endpoint && endpoint.onMessage;

                 if(endpoint) {
                    endpoint.__connections[selfVip] = true;
                 }

                 if(handler) {
                    handler({sourceVIP: selfVip, message: message, endpoint: endpoint});
                 }
             }, 0)
         }

         var parentDestroy = self.destroy;
         self.destroy = function() {
            for(var connectedVIP in self.__connections){
                try{
                    self.closeConnection(connectedVIP);
                }catch(e){
                    Log.error(selfVip, "in-browser-hub", ["Error closing connection", e]);
                }
            }

            parentDestroy();
         }

         self.closeConnection = function(targetVip) {
            if(!self.__connections[targetVip]) return;
            var endpoint = selfHub.getEndPoint(targetVip);

            self.__connections[targetVip] = false
            self.__fireConnectionLost(targetVip);

            if(endpoint) {
                endpoint.__connections[targetVip] = false;
                endpoint.__fireConnectionLost(selfVip);
            }
         }
      }
   };
});


