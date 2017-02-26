define(["utils/logger", "utils/observable"], function(Log, Observable) {

   return function VNFHub(){
      var self = this;

      var hub = {};

      self.BaseEndPoint = function BaseEndPoint(selfVip) {
         var self = this;
         var destroyListeners = new Observable();
         var invalidateListeners = new Observable();
         var connectionLostListeners = new Observable();

         self.vip = selfVip;

         self.onMessage = null;
         var destroyed = false;

         self.isDestroyed = function() {
             return destroyed;
         }

         self.onDestroy = destroyListeners.addListener;

         self.onInvalidate = invalidateListeners.addListener;
         self.invalidate   = invalidateListeners.fire;

         self.onConnectionLost = invalidateListeners.addListener;
         self.__fireConnectionLost = invalidateListeners.fire;

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