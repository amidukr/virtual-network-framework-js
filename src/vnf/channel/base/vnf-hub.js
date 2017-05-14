define(["utils/logger", "utils/observable"], function(Log, Observable) {

   window.vnfActiveEndpoints = [];

   return function VnfHub(){
      var self = this;

      var hub = {};

      self.BaseEndPoint = function BaseEndPoint(selfVip) {
         var self = this;
         var destroyListeners = new Observable();
         var connectionLostListeners = new Observable();

         window.vnfActiveEndpoints.push(self);

         self.vip = selfVip;

         self.onMessage = null;
         var destroyed = false;

         self.isDestroyed = function() {
             return destroyed;
         }

         self.onDestroy = destroyListeners.addListener;

         self.onConnectionLost = connectionLostListeners.addListener;
         self.__fireConnectionLost = connectionLostListeners.fire;

         self.destroy = function() {
            if(destroyed) return;
            destroyed = true;

            delete hub[selfVip];

            destroyListeners.fire();

            window.vnfActiveEndpoints.removeValue(self);
         }
      }

      self.getEndPoint = function(vip) {
          return hub[vip];
      }

      self.openEndpoint = function openEndpoint(vip) {
          var endpoint = hub[vip];
          if(!endpoint) {
              endpoint = new self.VnfEndpoint(vip);
              hub[vip] = endpoint;
          }

          return endpoint;
      }
   };
});