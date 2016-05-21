define(["utils/logger"], function(Log) {

   

   return function InBrowserHub(){
      var self = this;

      var hub = {};

      function InBrowserChannel(selfVip) {
         var self = this;

         self.vip = selfVip;

         self.onMessage = null;

         self.send = function(vip, message) {
             window.setTimeout(function inBrowserSend() {
                 var channel = hub[vip];
                 var handler = channel && channel.onMessage;
                 if(handler) {
                    handler({sourceVIP: selfVip, message: message, channel: channel});
                 }
             }, 0)
         }
      };

      self.openChannel = function openChannel(vip) {
          var channel = hub[vip];
          if(!channel) {
              channel = new InBrowserChannel(vip);
              hub[vip] = channel;
          }

          return channel;
      }
   };
});


