requirejs(["vnf/vnf", "utils/capture-logs"],
    function(VNF,                     Log){

    function newPrintCallback(instance) {
        return function onMessage(event) {
            Log.info(instance, "message-test-handler", "from " + event.sourceVIP + ": " + event.message);
        }
    }

    function testChannelHub(hubName, hubFactory) {
       function hubQUnitTest(testCaseName, testCaseFunction) {
           var testCaseDescription = "[" + hubName + "]: " + testCaseName;

           QUnit.test(testCaseDescription, function(assert){
               Log.info("test", testCaseDescription);
               
               testCaseFunction(assert);
           });
       }; 

       hubQUnitTest("Channel Send Test", function( assert ) {
           var done = assert.async(3);

           var channelHub = new VNF.InBrowserHub();

           var channel1 = channelHub.openChannel("vip-1");
           var channel2 = channelHub.openChannel("vip-2");
           var channel3 = channelHub.openChannel("vip-3");



           channel1.onMessage = newPrintCallback("vip-1");
           channel2.onMessage = newPrintCallback("vip-2");
           channel3.onMessage = newPrintCallback("vip-3");

           var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);
           var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
           var capture3 = Log.captureLogs(assert, ["vip-3"], ["message-test-handler"]);


           channel1.send("vip-2", "message-from-vip1-to-vip2");
           channel1.send("vip-3", "message-from-vip1-to-vip3");

           channel2.send("vip-1", "message-from-vip2-to-vip1");
           channel2.send("vip-3", "message-from-vip2-to-vip3");

           channel3.send("vip-1", "message-from-vip3-to-vip1");
           channel3.send("vip-2", "message-from-vip3-to-vip2");
           channel3.send("vip-3", "message-from-vip3-to-vip3");

           capture1.assertLog(["from vip-2: message-from-vip2-to-vip1",
                               "from vip-3: message-from-vip3-to-vip1"])
                    .then(done);

           capture2.assertLog(["from vip-1: message-from-vip1-to-vip2",
                               "from vip-3: message-from-vip3-to-vip2"])
                   .then(done);

           capture3.assertLog(["from vip-1: message-from-vip1-to-vip3",
                               "from vip-2: message-from-vip2-to-vip3",
                               "from vip-3: message-from-vip3-to-vip3"])
                   .then(done);
        });

        hubQUnitTest("Channel Callback Test", function( assert ) {

            var done = assert.async(3);

            var channelHub = new VNF.InBrowserHub();

            var channel1 = channelHub.openChannel("vip-1");
            var channel2 = channelHub.openChannel("vip-2");
            var channel3 = channelHub.openChannel("vip-3");

            function newPingPongCallback(instance) {
                return function onMessage(event) {
                    Log.info(instance, "message-test-handler", "from " + event.sourceVIP + ": " + event.message);
                    event.channel.send(event.sourceVIP, "pong from " + instance + "[" + event.message + "]");
                }
            }

            var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);
            var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
            var capture3 = Log.captureLogs(assert, ["vip-3"], ["message-test-handler"]);

            channel1.onMessage = newPrintCallback("vip-1");
            channel2.onMessage = newPingPongCallback("vip-2");
            channel3.onMessage = newPingPongCallback("vip-3");

            channel1.send("vip-2", "message-from-vip1-to-vip2");
            channel1.send("vip-3", "message-from-vip1-to-vip3");

            capture1.assertLog(["from vip-2: pong from vip-2[message-from-vip1-to-vip2]",
                                "from vip-3: pong from vip-3[message-from-vip1-to-vip3]"])
                    .then(done);

            capture2.assertLog("from vip-1: message-from-vip1-to-vip2").then(done);
            capture3.assertLog("from vip-1: message-from-vip1-to-vip3").then(done);
        });

        hubQUnitTest("Channel Loopback Test", function( assert ) {

            var done = assert.async(1);

            var channelHub = new VNF.InBrowserHub();

            var channel1 = channelHub.openChannel("vip-1");
            var channel2 = channelHub.openChannel("vip-2");

            channel1.onMessage = newPrintCallback("vip-1");

            var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);

            channel1.send("vip-1", "loopback-message-to-vip1");

            capture1.assertLog("from vip-1: loopback-message-to-vip1").then(done);
        });

        hubQUnitTest("Channel Big Message Test", function( assert ) {
            Log.info("test", "Channel Big Message Test");

            var done = assert.async(1);

            var channelHub = new VNF.InBrowserHub();

            var channel1 = channelHub.openChannel("vip-1");
            var channel2 = channelHub.openChannel("vip-2");

            var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);

            var bigMessage = new Array(65543).join('STRING');

            channel2.onMessage = function(event) {
                assert.deepEqual(event.message, bigMessage,  "Asserting captured logs");
                Log.info("vip-2", "message-test-handler", event.message.substr(0, 516) + "\n.......");
                done();
            };

            channel1.send("vip-2", bigMessage)
        });
    }

    testChannelHub("InBrowserHub");

    
})
