define(["utils/logger"], function(Log) {

   return function VNFHub(){
      var self = this;

      var hub = {};

      self.BaseEndPoint = function BaseEndPoint(selfVip) {
         var self = this;

         self.vip = selfVip;

         self.onMessage = null;
         var destroyed = false;

         self.isDestroyed = function() {
             return destroyed;
         }

         self.destroy = function() {
            if(destroyed) return;
            destroyed = true;

            delete hub[selfVip];
         }
      }

      self.getEndPoint = function(vip) {
          return hub[vip];
      }

      self.openEndpoint = function openEndpoint(vip) {
          var endpoint = hub[vip];
          if(!endpoint) {
              endpoint = new self.VNFEndPoint(vip);
              hub[vip] = endpoint;
          }

          return endpoint;
      }
   };
});