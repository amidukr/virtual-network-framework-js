define(["utils/logger", "utils/observable"], function(Log, Observable) {

   return function VNFHub(){
      var self = this;

      var hub = {};

      self.BaseEndPoint = function BaseEndPoint(selfVip) {
         var self = this;
         var destroyListeners = new Observable();
         var connectionLostListeners = new Observable();

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
         }
      }

      self.getEndPoint = function(vip) {
          return hub[vip];
      }

      self.openEndpoint = function openEndpoint(vip) {
          var endpoint = hub[vip];
          if(!endpoint) {
              endpoint = new self.VNFEndpoint(vip);
              hub[vip] = endpoint;
          }

          return endpoint;
      }
   };
});