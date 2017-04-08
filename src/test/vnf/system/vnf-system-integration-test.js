requirejs(["vnf/vnf",
           "vnf/global",
           "utils/signal-captor",
           "utils/logger",
           "test/vnf-test-utils",
           "lib/bluebird"],
function(  VNF,
           Global,
           SignalCaptor,
           Log,
           VNFTestUtils,
           Promise){

    function vnfSystemIntegrationTest(description, callback) {
        var vnfSystem = new VNF.System();

        //VNF.System.registerWebSocket(vnfSystem, "http://....");
        //VNF.System.registerInBrowser(vnfSystem, inBrowserHub, inBrowserStore);


    }

    vnfSystemIntegrationTest("Service call test",  function(assert, argument){
        var done = assert.async(1);

        function MockService(endpoint) {
            this.handlers = {
                "test-method": function(event) {
                    assert.equal(event.message,      "test-method-argument",   "asserting event message");
                    assert.equal(event.method,       "test-method",            "asserting event method");
                    assert.equal(event.sourceVIP,    "consumer-endpoint",      "asserting event sourceVIP");
                    assert.equal(event.endpoint,     endpoint,                 "asserting event endpoint");
                    assert.equal(event.endpoint.vip, "provider-endpoint".      "asserting event endpoint vip");

                    return "test-method-result";
                }
            }
        }

        argument.vnfSystem.registerService(MockService);

        var providerEndpoint = argument.vnfSystem.openEndpoint("provider-endpoint");
        var consumerEndpoint = argument.vnfSystem.openEndpoint("consumer-endpoint");

        Promise.resolve()
        .then(consumerEndpoint.call("provider-endpoint", "test-method", "test-method-argument"))
        .then(function(result){
            assert.equal(result, "test-method-result", "asserting service call result");
        })
        .then(done);
    })

    vnfSystemIntegrationTest("Service push test",  function(assert, argument){
        var done = assert.async(2);

        var i = 0;

        function MockService(endpoint) {
            this.handlers = {
                "test-method": function(event) {
                    i++;
                    assert.equal(event.message,      "test-method-argument-" + i,   "asserting event message " + i);

                    done();
                }
            }
        }

        argument.vnfSystem.registerService(MockService);

        var providerEndpoint = argument.vnfSystem.openEndpoint("provider-endpoint");
        var consumerEndpoint = argument.vnfSystem.openEndpoint("consumer-endpoint");

        Promise.resolve()
        .then(consumerEndpoint.push("provider-endpoint", "test-method", "test-method-argument-1"))
        .then(consumerEndpoint.push("provider-endpoint", "test-method", "test-method-argument-2"))
        .then(done);
    })

    vnfSystemIntegrationTest("Service call async processing test",  function(assert, argument){
        var done = assert.async(1);

        function MockService(endpoint) {
            this.handlers = {
                "test-method": function(event) {
                    return Promise.resolve("test-method-result");
                }
            }
        }

        argument.vnfSystem.registerService(MockService);

        var providerEndpoint = argument.vnfSystem.openEndpoint("provider-endpoint");
        var consumerEndpoint = argument.vnfSystem.openEndpoint("consumer-endpoint");

        Promise.resolve()
        .then(consumerEndpoint.call("provider-endpoint", "test-method", "test-method-argument"))
        .then(function(result){
            assert.equal(result, "test-method-result", "asserting service call result");
        })
        .then(done);
    });

    vnfSystemIntegrationTest("Service call failed: unknown method test",  function(assert, argument){
        var done = assert.async(1);

        var providerEndpoint = argument.vnfSystem.openEndpoint("provider-endpoint");
        var consumerEndpoint = argument.vnfSystem.openEndpoint("consumer-endpoint");

        Promise.resolve()
        .then(consumerEndpoint.call("provider-endpoint", "test-method", "test-method-argument"))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.CALL_FAILED_UNKNOWN_METHOD, "asserting error reason");
        })
        .then(done);
    });

    vnfSystemIntegrationTest("Service call failed: unexpected error test",  function(assert, argument){
        var done = assert.async(1);

        function MockService(endpoint) {
            this.handlers = {
                "test-method": function(event) {
                    throw new Error("some-error-occurred");
                }
            }
        }

        argument.vnfSystem.registerService(MockService);

        var providerEndpoint = argument.vnfSystem.openEndpoint("provider-endpoint");
        var consumerEndpoint = argument.vnfSystem.openEndpoint("consumer-endpoint");

        Promise.resolve()
        .then(consumerEndpoint.call("provider-endpoint", "test-method", "test-method-argument"))
         .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.CALL_FAILED_UNEXPECTED_EXCEPTION, "asserting error reason");
        })
        .then(done);
    });

    vnfSystemIntegrationTest("Service call failed: controlled failure test",  function(assert, argument){
        var done = assert.async(1);

        function MockService(endpoint) {
            this.handlers = {
                "test-method": function(event) {
                    return new Error("fail-reason-code");
                }
            }
        }
        argument.vnfSystem.registerService(MockService);


        var providerEndpoint = argument.vnfSystem.openEndpoint("provider-endpoint");
        var consumerEndpoint = argument.vnfSystem.openEndpoint("consumer-endpoint");

        Promise.resolve()
        .then(consumerEndpoint.call("provider-endpoint", "test-method", "test-method-argument"))
         .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, "fail-reason-code", "asserting error reason");
        })
        .then(done);
    });

    vnfSystemIntegrationTest("onConnectionLost test",  function(assert, argument){
        var done = assert.async(1);

        var captor = new SignalCaptor(assert);

        function MockService(endpoint) {
            this.handlers = {
                "ping": function(event) {
                    return "pong";
                }
            }

            this.onConnectionLost = function(event) {
                captor.signal("connection-lost: " + event.sourceVIP);
            };
        }

        var providerEndpoint = argument.vnfSystem.openEndpoint("provider-endpoint");
        var consumerEndpoint = argument.vnfSystem.openEndpoint("consumer-endpoint");

        Promise.resolve()
        .then(consumerEndpoint.call.bind(null, "provider-endpoint", "ping"))
        .then(consumerEndpoint.closeConnection.bind(null, "provider-endpoint"))
        .then(captor.assertSignals.bind(null, ["connection-lost: consumer-endpoint"]))
        .then(done);
    });

    vnfSystemIntegrationTest("Store service test",  function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.storeClient;

        Promise.resolve()
        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry value"}))
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
            assert.equal(value, "entry value", "asserting inserted entry");
        })
        .then(done);
    });
});