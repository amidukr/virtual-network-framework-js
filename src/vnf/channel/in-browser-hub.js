define(["utils/logger"], function(Log) {

   

   return function InBrowserHub(){
      var self = this;

      var hub = {};

      function InBrowserEndpoint(selfVip) {
         var self = this;

         self.vip = selfVip;

         self.onMessage = null;

         self.send = function(vip, message) {
             window.setTimeout(function inBrowserSend() {
                 var endpoint = hub[vip];
                 var handler = endpoint && endpoint.onMessage;
                 if(handler) {
                    handler({sourceVIP: selfVip, message: message, endpoint: endpoint});
                 }
             }, 0)
         }
      };

      self.openEndpoint = function openEndpoint(vip) {
          var endpoint = hub[vip];
          if(!endpoint) {
              endpoint = new InBrowserEndpoint(vip);
              hub[vip] = endpoint;
          }

          return endpoint;
      }
   };
});


