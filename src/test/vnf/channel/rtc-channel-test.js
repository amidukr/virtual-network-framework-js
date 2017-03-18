requirejs(["vnf/vnf",
           "utils/signal-captor",
           "utils/logger",
           "test/vnf-test-utils",
           "lib/bluebird"],
function(  VNF,
           SignalCaptor,
           Log,
           VNFTestUtils,
           Promise){

    QUnit.test("[RTCHub]: synchronous connect stress test", function(assert){
        if(!VNFTestUtils.isTestingLevelEnabled(TESTING_LEVEL_STRESS)) {
            Log.info("test", "[RTCHub]: synchronous connect stress test");
            assert.ok(true, "Skipping test due to testing level");
            return;
        }

        QUnit.config.testTimeout = 60000;

        var n = 0;

        var done = assert.async(1);

        function doTest() {
            n++;

            var rtcHub = new VNF.RTCHub(new VNF.InBrowserHub());
            var endpoint1 = rtcHub.openEndpoint("vip-1");
            var endpoint2 = rtcHub.openEndpoint("vip-2");

            var captor1 = new SignalCaptor(assert);
            var captor2 = new SignalCaptor(assert);

            endpoint1.onMessage = VNFTestUtils.newPrintCallback(captor1, "vip-1");
            endpoint2.onMessage = VNFTestUtils.newPrintCallback(captor2, "vip-2");

            endpoint1.send("vip-2", "message-to-vip-2");
            endpoint2.send("vip-1", "message-to-vip-1");

            var failed = false;

            return Promise.resolve()
                .then(captor1.takeNext.bind(null, 1))
                .then(function(actual){
                    assert.deepEqual(actual, ["from vip-2: message-to-vip-1"],  "Expected: from vip-2: message-to-vip-1");
                    failed |= actual[0] != "from vip-2: message-to-vip-1";
                })

                .then(captor2.takeNext.bind(null, 1))
                .then(function(actual){
                    assert.deepEqual(actual, ["from vip-1: message-to-vip-2"],  "Expected: from vip-1: message-to-vip-2");
                    failed |= actual[0] != "from vip-1: message-to-vip-2";
                })


                .then(endpoint1.destroy)
                .then(endpoint2.destroy)

                .then(function(){
                    if(n < 100 && !failed) {
                        return doTest();
                    }
                });
        }

        Promise.resolve()
        .then(doTest)
        .then(done);

    })

});