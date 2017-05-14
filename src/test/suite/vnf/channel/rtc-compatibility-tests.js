requirejs(["vnf/vnf",
           "utils/signal-captor",
           "test/utils/vnf-test-utils"],
function(  Vnf,
           SignalCaptor,
           VnfTestUtils){

    function hubQUnitTest(description, callback) {
        function prepareArgs(hubName, hubConstructor, configureHubCallback) {
            return function(assert, args) {
                args.hubName = hubName;

                return {hubFactory: function(){
                            var hub = new hubConstructor(args.rootHubFactory())
                            if(configureHubCallback) configureHubCallback(hub);
                            return hub;
                       }};
            }
        }


        function runTest(hubName, description, hub, callback, configureHubCallback) {
            QUnit.module(hubName + " Compatibility Tests");
            VnfTestUtils.vnfTest("[" + hubName + "] Compatibility Tests: "  + description, prepareArgs(hubName, hub, configureHubCallback),  callback);
        }

        function configureReliableHub(reliableHub) {
            reliableHub.setHeartbeatInterval(100);
            reliableHub.setConnectionInvalidateInterval(1000);
            reliableHub.setConnectionLostTimeout(3000);
            reliableHub.setKeepAliveHandshakingChannelTimeout(2000);
        }

        runTest("InBrowserHub",  description, Vnf.InBrowserHub,  callback);
        runTest("RtcHub",        description, Vnf.RtcHub,        callback);
        runTest("UnreliableHub", description, Vnf.UnreliableHub, callback);
        runTest("ReliableHub",   description, Vnf.ReliableHub,   callback, configureReliableHub);
    };

    hubQUnitTest("Send and close test", function(assert, arguments) {
        var done = assert.async(1);

        var vnfHub = arguments.hubFactory();

        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");

        var capture1 = new SignalCaptor(assert);
        var capture2 = new SignalCaptor(assert);

        endpoint1.onMessage = VnfTestUtils.newPrintCallback(capture1, "vip-1");
        endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "vip-2");

        endpoint1.send("vip-2", "message-1");
        endpoint1.closeConnection("vip-2");

        Promise.resolve()
        .then(capture1.assertSilence.bind(null, 3000))
        .then(capture2.assertSilence.bind(null, 0))

        .then(function(){
            assert.equal(endpoint2.isConnected("vip-1"), false, "Verifying vip-1 connection closed for vip-2");
            assert.equal(endpoint2.isConnected("vip-2"), false, "Verifying vip-2 connection closed for vip-2");
        })

        .then(endpoint1.destroy)
        .then(endpoint2.destroy)

        .then(done);
    });

     hubQUnitTest("Connect, send, close and test", function(assert, arguments) {

        if(arguments.testProfile == "root:InMemory" && arguments.hubName == "RtcHub") {
            assert.ok(true, "Skipping this test case")
            return;
        }

        var done = assert.async(1);

        var vnfHub = arguments.hubFactory();

        var endpoint1 = vnfHub.openEndpoint("vip-1");
        var endpoint2 = vnfHub.openEndpoint("vip-2");

        var capture1 = new SignalCaptor(assert);
        var capture2 = new SignalCaptor(assert);

        endpoint1.onMessage = VnfTestUtils.newPrintCallback(capture1, "vip-1");
        endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "vip-2");

        endpoint1.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(capture1, "vip-1"));
        endpoint2.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(capture2, "vip-2"));



        endpoint1.send("vip-2", "message-1");



        Promise.resolve()
        .then(capture2.assertSignals.bind(null, ["from vip-1: message-1"]))

        .then(endpoint2.send.bind(null, "vip-1", "message-2"))
        .then(capture1.assertSignals.bind(null, ["from vip-2: message-2"]))

        .then(function(){
            endpoint1.send("vip-2", "message-3");
            endpoint1.closeConnection("vip-2");
        })


        .then(capture2.assertSignalsUnordered.bind(null, ["from vip-1: message-3", "from vip-1 connection lost"]))
        .then(capture1.assertSignals.bind(null, ["from vip-2 connection lost"]))
        .then(capture1.assertSilence.bind(null, 2000))

        .then(function(){
            assert.equal(endpoint2.isConnected("vip-1"), false, "Verifying vip-1 connection closed for vip-2");
            assert.equal(endpoint1.isConnected("vip-2"), false, "Verifying vip-2 connection closed for vip-1");
        })

        .then(endpoint1.destroy)
        .then(endpoint2.destroy)

        .then(done);
    });
});