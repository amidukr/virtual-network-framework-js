requirejs(["vnf/vnf",
           "utils/capture-logs",
           "test/vnf-test-utils"],
function(  VNF,
           Log,
           VNFTestUtils){

    function hubQUnitTest(description, callback) {
        function prepareArgs(hubConstructor, configureHubCallback) {
            return function(assert, args) {
                return {hubFactory: function(){
                            var hub = new hubConstructor(args.rootHubFactory())
                            if(configureHubCallback) configureHubCallback(hub);
                            return hub;
                       }};
            }
        }


        function runTest(hubName, description, hub, callback, configureHubCallback) {
            QUnit.module(hubName + " Generic VNF Tests");
            VNFTestUtils.vnfTest("[" + hubName + "] Generic VNF Tests: "  + description, prepareArgs(hub, configureHubCallback),  callback);
        }

        function configureReliableHub(reliableHub) {
            reliableHub.setHeartbeatInterval(10);
            reliableHub.setConnectionInvalidateInterval(100);
            reliableHub.setConnectionLostTimeout(300);
            reliableHub.setKeepAliveHandshakingChannelTimeout(200);
        }

        runTest("InBrowserHub",  description, VNF.InBrowserHub,  callback);
        runTest("RTCHub",        description, VNF.RTCHub,        callback);
        runTest("UnreliableHub", description, VNF.UnreliableHub, callback);
        runTest("ReliableHub",   description, VNF.ReliableHub,   callback, configureReliableHub);
    };


    hubQUnitTest("Channel API Verification", function(assert, arguments) {
         var vnfHub = arguments.hubFactory();
 
         var endpoint1 = vnfHub.openEndpoint("vip-1");
 
         assert.ok(endpoint1.send, "Verifying send method");
         assert.notOk(endpoint1.invalidate, "Invalidate method is deprecated");
         assert.ok(endpoint1.closeConnection,  "Verifying closeConnection method");
         assert.ok(endpoint1.onConnectionLost, "Verifying onConnectionLost method");
         assert.ok(endpoint1.destroy, "Verifying destroy method");
         assert.equal(endpoint1.vip, "vip-1", "Verifying vip property");;
 
         endpoint1.destroy();
    });
 
    hubQUnitTest("Channel Send Test", function(assert, arguments) {
        var done = assert.async(1);
 
        var vnfHub = arguments.hubFactory();
 
        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");
 
        endpoint2.onMessage = function(event) {
            Log.info(event.endpoint.vip, "message-test-handler", JSON.stringify(event));
 
            assert.equal(event.message,   "vip-1 to vip-2 message");
            assert.equal(event.sourceVIP, "vip-1");
            assert.equal(event.endpoint, endpoint2);
            assert.equal(event.endpoint.vip, "vip-2");
 
            done();
        };
 
        endpoint1.send("vip-2", "vip-1 to vip-2 message");
    });
 
    hubQUnitTest("Channel Send Object Test", function(assert, arguments) {
         var done = assert.async(1);
 
        var vnfHub = arguments.hubFactory();
 
        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");
 
        endpoint2.onMessage = function(event) {
            Log.info(event.endpoint.vip, "message-test-handler", JSON.stringify(event));
 
            assert.equal(event.message.value1,       "object-value-1");
            assert.equal(event.message.sub.value2,   "object-sub-value-2");
 
            done();
        };
 
        endpoint1.send("vip-2", {value1: "object-value-1", sub:{value2: "object-sub-value-2"}});
    });
 
    hubQUnitTest("Channel Send Message Sequence Test", function(assert, arguments) {
        var done = assert.async(1);
 
        var vnfHub = arguments.hubFactory();
 
        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");
 
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
 
        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");
 
        endpoint1.send("vip-2", "message-sequence-1-from-vip1-to-vip2");
        
        capture2.assertLog(["from vip-1: message-sequence-1-from-vip1-to-vip2"])
           .then(endpoint1.send.bind(null,          "vip-2", "message-2-sequence-1-from-vip1-to-vip2"))
           .then(capture2.assertLog.bind(null, ["from vip-1: message-2-sequence-1-from-vip1-to-vip2"]))
        .then(done);
    });
 
    hubQUnitTest("Channel Double Message Send  Test", function(assert, arguments) {
 
         var done = assert.async(1);
 
         var vnfHub = arguments.hubFactory();
 
         var endpoint1 = vnfHub.openEndpoint("vip-1");
         var endpoint2 = vnfHub.openEndpoint("vip-2");
 
         var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
 
         endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");
 
 
         endpoint1.send("vip-2", "double-message-1-from-vip1-to-vip2");
         endpoint1.send("vip-2", "double-message-2-from-vip1-to-vip2");
 
 
         capture2.assertLog(["from vip-1: double-message-1-from-vip1-to-vip2",
                             "from vip-1: double-message-2-from-vip1-to-vip2"])
                 .then(done);
     });
 
    hubQUnitTest("Channel Callback Test", function(assert, arguments) {
 
         var done = assert.async(3);
 
         var vnfHub = arguments.hubFactory();
 
         var endpoint1 = vnfHub.openEndpoint("vip-1");
         var endpoint2 = vnfHub.openEndpoint("vip-2");
         var endpoint3 = vnfHub.openEndpoint("vip-3");
 
         function newPingPongCallback(instance) {
             return function onMessage(event) {
                 Log.info(instance, "message-test-handler", "from " + event.sourceVIP + ": " + event.message);
                 event.endpoint.send(event.sourceVIP, "pong from " + instance + "[" + event.message + "]");
             }
         }
 
         var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);
         var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
         var capture3 = Log.captureLogs(assert, ["vip-3"], ["message-test-handler"]);
 
         endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");
         endpoint2.onMessage = newPingPongCallback("vip-2");
         endpoint3.onMessage = newPingPongCallback("vip-3");
 
         endpoint1.send("vip-2", "message-from-vip1-to-vip2");
         endpoint1.send("vip-3", "message-from-vip1-to-vip3");
 
         capture1.assertLogUnordered(["from vip-2: pong from vip-2[message-from-vip1-to-vip2]",
                                      "from vip-3: pong from vip-3[message-from-vip1-to-vip3]"])
                 .then(done);
 
         capture2.assertLog("from vip-1: message-from-vip1-to-vip2").then(done);
         capture3.assertLog("from vip-1: message-from-vip1-to-vip3").then(done);
     });
 
     hubQUnitTest("Concurrent Connection Estabilish Test", function(assert, arguments) {
 
         var done = assert.async(2);
 
         var vnfHub = arguments.hubFactory();
 
         var endpoint1 = vnfHub.openEndpoint("vip-1");
         var endpoint2 = vnfHub.openEndpoint("vip-2");
 
         endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");
         endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");
 
         var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);
         var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
 
         endpoint1.send("vip-2", "concurrent-vip1-to-vip2-message");
         endpoint2.send("vip-1", "concurrent-vip2-to-vip1-message");
 
         capture1.assertLog("from vip-2: concurrent-vip2-to-vip1-message").then(done);
         capture2.assertLog("from vip-1: concurrent-vip1-to-vip2-message").then(done);
     });
 
     hubQUnitTest("Channel Loopback Test", function(assert, arguments) {
 
         var done = assert.async(1);
 
         var vnfHub = arguments.hubFactory();
 
         var endpoint1 = vnfHub.openEndpoint("vip-1");
         var endpoint2 = vnfHub.openEndpoint("vip-2");
 
         endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");
 
         var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);
 
         endpoint1.send("vip-1", "loopback-message-to-vip1");
 
         capture1.assertLog("from vip-1: loopback-message-to-vip1").then(done);
     });
 
     hubQUnitTest("Multiple/Loopback Channels Send Test", function(assert, arguments) {
 
        var done = assert.async(3);
 
        var vnfHub = arguments.hubFactory();
 
        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");
        var endpoint3 = vnfHub.openEndpoint("vip-3");
 
 
 
        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");
        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");
        endpoint3.onMessage = VNFTestUtils.newPrintCallback("vip-3");
 
        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
        var capture3 = Log.captureLogs(assert, ["vip-3"], ["message-test-handler"]);
 
 
        endpoint1.send("vip-2", "message-from-vip1-to-vip2");
        endpoint1.send("vip-3", "message-from-vip1-to-vip3");
 
        endpoint2.send("vip-1",     "message-from-vip2-to-vip1");
        endpoint2.send("vip-3", "1st-message-from-vip2-to-vip3");
        endpoint2.send("vip-3", "2nd-message-from-vip2-to-vip3");
 
        endpoint3.send("vip-1", "message-from-vip3-to-vip1");
        endpoint3.send("vip-2", "message-from-vip3-to-vip2");
        endpoint3.send("vip-3", "message-from-vip3-to-vip3");
 
        capture1.assertLogUnordered(["from vip-2: message-from-vip2-to-vip1",
                                     "from vip-3: message-from-vip3-to-vip1"])
                 .then(done);
 
        capture2.assertLogUnordered(["from vip-1: message-from-vip1-to-vip2",
                                     "from vip-3: message-from-vip3-to-vip2"])
                .then(done);
 
        capture3.assertLogUnordered(["from vip-1: message-from-vip1-to-vip3",
                                     "from vip-2: 1st-message-from-vip2-to-vip3",
                                     "from vip-2: 2nd-message-from-vip2-to-vip3",
                                     "from vip-3: message-from-vip3-to-vip3"])
                .then(done);
     });
 
     hubQUnitTest("Channel Big Message Test", function(assert, arguments) {
 
         var vnfHub = arguments.hubFactory();
 
         var endpoint1 = vnfHub.openEndpoint("vip-1");
         var endpoint2 = vnfHub.openEndpoint("vip-2");
 
         var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
 
         var bigMessage = [
             new Array(64*1024).join('A'),
             new Array(64*1024).join('AB'),
             new Array(64*1024).join('Hello World!'),
             new Array(10*64*1024 - 1).join('A'),
             "Hello World!" + new Array(64*1024).join('A') + "Hello World!"
         ];
 
         var done = assert.async(bigMessage.length);
 
 
         var index = 0;
         endpoint2.onMessage = function(event) {
             assert.deepEqual(event.message, bigMessage[index++],  "Asserting captured logs");
 
             Log.info("vip-2", "message-test-handler", event.message.substr(0, 100) + "\n.......");
 
             done();
         };
 
         for(var i = 0; i < bigMessage.length; i++) {
             endpoint1.send("vip-2", bigMessage[i]);
         }
 
     });

    hubQUnitTest("Call closeConnection, catch onConnectionLost", function(assert, arguments) {
        var done = assert.async(1);

        var vnfHub = arguments.hubFactory();

        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");

        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler", "connection-lost-handler"]);
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler", "connection-lost-handler"]);

        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");
        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

        endpoint1.onConnectionLost(VNFTestUtils.newConnectionLostPrintCallback("vip-1"));
        endpoint2.onConnectionLost(VNFTestUtils.newConnectionLostPrintCallback("vip-2"));

        endpoint1.send("vip-2", "message-1");

        Promise.resolve()
        .then(capture2.assertLog.bind(null, ["from vip-1: message-1"]))

        .then(endpoint2.send.bind(null, "vip-1", "message-2"))
        .then(capture1.assertLog.bind(null, ["from vip-2: message-2"]))

        .then(endpoint1.closeConnection.bind(null, "vip-2"))

        .then(capture1.assertLog.bind(null, ["from vip-2 connection lost"]))
        .then(capture2.assertLog.bind(null, ["from vip-1 connection lost"]))

        .then(endpoint1.destroy)
        .then(endpoint2.destroy)

        .then(done);
    });

    hubQUnitTest("Call destroy, catch onConnectionLost", function(assert, arguments) {
        var done = assert.async(1);

        var vnfHub = arguments.hubFactory();

        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");

        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler", "connection-lost-handler"]);
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler", "connection-lost-handler"]);

        endpoint1.onMessage = VNFTestUtils.newPrintCallback("vip-1");
        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");

        endpoint1.onConnectionLost(VNFTestUtils.newConnectionLostPrintCallback("vip-1"));
        endpoint2.onConnectionLost(VNFTestUtils.newConnectionLostPrintCallback("vip-2"));

        endpoint1.send("vip-2", "message-1");

        Promise.resolve()
        .then(capture2.assertLog.bind(null, ["from vip-1: message-1"]))

        .then(endpoint2.send.bind(null, "vip-1", "message-2"))
        .then(capture1.assertLog.bind(null, ["from vip-2: message-2"]))

        .then(endpoint1.destroy)

        .then(capture1.assertLog.bind(null, ["from vip-2 connection lost"]))
        .then(capture2.assertLog.bind(null, ["from vip-1 connection lost"]))

        .then(endpoint2.destroy)

        .then(done);
    });
 
    hubQUnitTest("Channel Destroy Method Verification", function(assert, arguments) {
         var vnfHub = arguments.hubFactory();
 
         var endpointV1 = vnfHub.openEndpoint("vip-1");
         endpointV1.destroy();
         var endpointV2 = vnfHub.openEndpoint("vip-1");
 
         assert.ok(endpointV1 != endpointV2, "Verifying new endpoint retrieved after destroy different")
    });
 
    hubQUnitTest("Channel Send to Destroyed", function(assert, arguments) {
        var done = assert.async(1);
 
        var vnfHub = arguments.hubFactory();
 
        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");
        var endpoint3 = vnfHub.openEndpoint("vip-3");
 
 
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
        var capture3 = Log.captureLogs(assert, ["vip-3"], ["message-test-handler"]);
 
        endpoint2.onMessage = VNFTestUtils.newPrintCallback("vip-2");
        endpoint3.onMessage = VNFTestUtils.newPrintCallback("vip-3");
 
        endpoint1.send("vip-2", "send-to-destroyed message-1 to vip-2");
        capture2.assertLog(["from vip-1: send-to-destroyed message-1 to vip-2"])
 
        .then(endpoint2.destroy)
         
        .then(endpoint1.send.bind(null, "vip-2", "send-to-destroyed message-2 to vip-2"))
        .then(endpoint1.send.bind(null, "vip-3", "send-to-destroyed message-2 to vip-3"))
 
        .then(capture3.assertLog.bind(null, ["from vip-1: send-to-destroyed message-2 to vip-3"]))
        .then(capture2.assertSilence.bind(null, 1))
 
        .then(endpoint1.send.bind(null, "vip-2", "send-to-destroyed message-3 to vip-2"))
        .then(endpoint1.send.bind(null, "vip-3", "send-to-destroyed message-3 to vip-3"))
 
        .then(capture3.assertLog.bind(null, ["from vip-1: send-to-destroyed message-3 to vip-3"]))
        .then(capture2.assertSilence.bind(null, 1))
        
        .then(endpoint1.destroy)
        .then(endpoint3.destroy)
 
        .then(done);
    });
 
    hubQUnitTest("Channel Verify Synchronous Destroy Call", function(assert, arguments) {
        var done = assert.async(1);
 
        var vnfHub = arguments.hubFactory();
 
        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
 
        var endpoint1V1 = vnfHub.openEndpoint("vip-1");
        var endpoint2V1 = vnfHub.openEndpoint("vip-2");
 
        var endpoint1V2;
        var endpoint2V2;
 
        endpoint1V1.onMessage = VNFTestUtils.newPrintCallback("vip-1", "V1");
        endpoint2V1.onMessage = VNFTestUtils.newPrintCallback("vip-2", "V1");
 
        endpoint1V1.send("vip-2", "destroy-test message-1-v1-to-vip-2");
        endpoint2V1.send("vip-1", "destroy-test message-2-v1-to-vip-1");
        
        Promise.resolve()
        .then(capture2.assertLog.bind(null, ["V1: from vip-1: destroy-test message-1-v1-to-vip-2"]))
        .then(capture1.assertLog.bind(null, ["V1: from vip-2: destroy-test message-2-v1-to-vip-1"]))
        .then(function(){
            endpoint1V1.destroy();
            endpoint2V1.destroy();
 
            endpoint1V2 = vnfHub.openEndpoint("vip-1");
            endpoint2V2 = vnfHub.openEndpoint("vip-2");
 
            endpoint1V2.onMessage = VNFTestUtils.newPrintCallback("vip-1", "V2");
            endpoint2V2.onMessage = VNFTestUtils.newPrintCallback("vip-2", "V2");
 
            endpoint1V2.send("vip-2", "destroy-test message-3-v2-to-vip-2");
            endpoint2V2.send("vip-1", "destroy-test message-4-v2-to-vip-1");
        })
 
        .then(capture2.assertLog.bind(null, ["V2: from vip-1: destroy-test message-3-v2-to-vip-2"]))
        .then(capture1.assertLog.bind(null, ["V2: from vip-2: destroy-test message-4-v2-to-vip-1"]))
 
        .then(function(){
            endpoint1V2.destroy();
            endpoint2V2.destroy();
        })
        .then(done);
    });
 
    hubQUnitTest("Channel Verify Synchronous Destroy-Invalidate Call", function(assert, arguments) {
        var done = assert.async(1);
 
        var vnfHub = arguments.hubFactory();
 
        var capture1 = Log.captureLogs(assert, ["vip-1"], ["message-test-handler"]);
        var capture2 = Log.captureLogs(assert, ["vip-2"], ["message-test-handler"]);
 
 
        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2V1 = vnfHub.openEndpoint("vip-2");
 
        var endpoint2V2;
 
        endpoint1.onMessage   = VNFTestUtils.newPrintCallback("vip-1", "V1");
        endpoint2V1.onMessage = VNFTestUtils.newPrintCallback("vip-2", "V1");
 
        endpoint1.send("vip-2", "message-1-v1-to-vip-2");
        endpoint2V1.send("vip-1", "message-2-v1-to-vip-1");
 
        Promise.resolve()
        .then(capture2.assertLog.bind(null, ["V1: from vip-1: message-1-v1-to-vip-2"]))
        .then(capture1.assertLog.bind(null, ["V1: from vip-2: message-2-v1-to-vip-1"]))
        .then(function(){
 
            endpoint2V1.destroy();
            endpoint1.invalidate("vip-2");
 
            endpoint2V2 = vnfHub.openEndpoint("vip-2");
 
            endpoint2V2.onMessage = VNFTestUtils.newPrintCallback("vip-2", "V2");
 
            endpoint1.send("vip-2", "message-3-v2-to-vip-2");
            endpoint2V2.send("vip-1", "message-4-v2-to-vip-1");
        })
 
        .then(capture2.assertLog.bind(null, ["V2: from vip-1: message-3-v2-to-vip-2"]))
        .then(capture1.assertLog.bind(null, ["V1: from vip-2: message-4-v2-to-vip-1"]))
 
        .then(function(){
            endpoint1.destroy();
            endpoint2V2.destroy();
        })
        .then(done);
    });
})
