define(["utils/logger"], function(Log) {

   window.RTCPeerConnection     = window.RTCPeerConnection     || window.mozRTCPeerConnection     || window.webkitRTCPeerConnection;
   window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
   window.RTCIceCandidate       = window.RTCIceCandidate       || window.mozRTCIceCandidate       || window.webkitRTCIceCandidate; 


   return function RTCHub(){
      var self = this;

      var hub = {};

      function RTCChannel(selfVip, signalingChannel) {
         var self = this;

         self.onMessage = null;

         self.send = function(vip, message) {

         }
      };

      self.openChannel = function openChannel(vip, signalingChannel) {
          var channel = hub[vip];
          if(!channel) {
              channel = new RTCChannel(vip, signalingChannel);
              hub[vip] = channel;
          }

          return channel;
      }
   };
});