define(["utils/logger"], function(Log) {

   var hub = {};

   var InBrowserChannel = function InBrowserChannel(selfVip) {
       var self = this;

       self.onMessage = null;

       self.send = function(vip, message) {
           window.setTimeout(function inBrowserSend() {
              var handler = hub[vip] && hub[vip].onMessage;
              if(handler) {
                  handler({sourceVIP: selfVip, message: message});
              }
           }, 0)

       }
   };

   return function InBrowserHub(){
      var self = this;

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


