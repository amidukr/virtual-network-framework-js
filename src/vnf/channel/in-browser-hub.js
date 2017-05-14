define(["utils/logger", "vnf/channel/base/vnf-hub"], function(Log, VnfHub) {

   return function InBrowserHub(){
      var selfHub = this;

      VnfHub.call(selfHub);

      selfHub.VnfEndpoint = function InBrowserEndpoint(selfVip) {
         var self = this;
         selfHub.BaseEndPoint.call(this, selfVip);

         var connections = {};

         self.setConnection = function(targetVip, endpoint) {
            connections[targetVip] = endpoint;
         }

         self.send = function(vip, message) {
             if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

            var remoteEndpoint = connections[vip];
            var connecting = false;
            if(!remoteEndpoint) {
                connecting = true;
                remoteEndpoint = selfHub.getEndPoint(vip);
                connections[vip] = remoteEndpoint;
            }

             window.setTimeout(function inBrowserSend() {
                if(!remoteEndpoint) return;

                if(remoteEndpoint == connections[vip]) {
                    remoteEndpoint.setConnection(selfVip, self);
                }

                var connectionDropped = connecting && remoteEndpoint != connections[vip];
                var handler = remoteEndpoint.onMessage;

                if(!connectionDropped && handler) {
                    handler({sourceVip: selfVip, message: message, endpoint: remoteEndpoint});
                }
             }, 0)
         }

         var parentDestroy = self.destroy;
         self.destroy = function() {
            for(var connectedVip in connections){
                try{
                    self.closeConnection(connectedVip);
                }catch(e){
                    Log.error(selfVip, "in-browser-hub", ["Error closing connection", e]);
                }
            }

            parentDestroy();
         }

        self.isConnected = function(targetVip) {
             return connections[targetVip] != undefined;
        }

         self.closeConnection = function(targetVip) {
            var remoteEndpoint = connections[targetVip];
            if(!remoteEndpoint) return;

            connections[targetVip] = undefined;
            window.setTimeout(self.__fireConnectionLost.bind(null, targetVip), 0);

            if(remoteEndpoint) {
                remoteEndpoint.closeConnection(selfVip);
            }
         }
      }
   };
});

