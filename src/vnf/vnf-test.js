 requirejs(["vnf", "../utils/capture-logs"],
    function(VNF,                       Log){
    //QUnit.test( "In-Browser pool", function( assert ) {
       var channelHub = new VNF.InBrowserHub();

       var channel1 = factory.openChannel("vip-1");
       var channel2 = factory.openChannel("vip-2");
       var channel3 = factory.openChannel("vip-3");

       function newMessageListener(instance) {
         return function onMessage(event) {
           Log.info(instance, "message-test-handler", "from " + event.sourceVIP + ": " + event.message);
         }
       }

       channel1.onMessage = newMessageListener("vip-1");
       channel2.onMessage = newMessageListener("vip-2");
       channel3.onMessage = newMessageListener("vip-3");


       channel1.send("vip-2", "message-from-vip1-to-vip2");
       channel1.send("vip-3", "message-from-vip1-to-vip3");

       channel2.send("vip-1", "message-from-vip2-to-vip1");
       channel2.send("vip-3", "message-from-vip2-to-vip3");

       channel3.send("vip-1", "message-from-vip3-to-vip1");
       channel3.send("vip-2", "message-from-vip3-to-vip2");
       channel3.send("vip-3", "message-from-vip3-to-vip3");

       Log.captureLogs(["vip-1"], ["message-test-handler"])
           .assertLog(["from vip-2: message-from-vip2-to-vip1",
                       "from vip-3: message-from-vip3-to-vip1"]);

       Log.captureLogs(["vip-2"], ["message-test-handler"])
           .assertLog(["from vip-1: message-from-vip1-to-vip2",
                       "from vip-3: message-from-vip3-to-vip2"]);

       Log.captureLogs(["vip-3"], ["message-test-handler"])
           .assertLog(["from vip-1: message-from-vip1-to-vip3",
                       "from vip-2: message-from-vip2-to-vip3",
                       "from vip-3: message-from-vip3-to-vip3"]);
    //});
})
