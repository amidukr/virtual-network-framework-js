
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

    function vfnSystemTest(description, callback) {
        var vnfSystem = new VNF.System();

        //VNF.System.registerWebSocket(vnfSystem, "http://....");
        //VNF.System.registerInBrowser(vnfSystem, inBrowserHub, inBrowserStore);

        argument.vnfEndpoint = .... //vnf-endpoint
        argument.rootEndpoint = .... //root-endpoint


    }

    vfnSystemTest("Consume side test: Service call test",  function(assert, argument){
        var done = assert.async(1);

        var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ['from vnf-endpoint: {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from vnf-endpoint: {"type":"CALL","token":1,"method":"test-method","argument":"test-method-argument-2"}']))
        .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"RESPONSE","token":1,"result":"response-to-argument-2"}))
        .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"RESPONSE","token":0,"result":"response-to-argument-1"}))

        Promise.all(vnfEndpoint.call("root-endpoint", "test-method", "test-method-argument-1"),
                    vnfEndpoint.call("root-endpoint", "test-method", "test-method-argument-2"))
        .then(function(results){
            assert.equal(results[0], "response-to-argument-1", "Verifying first call response")
            assert.equal(results[1], "response-to-argument-1", "Verifying second call response")
        })
        .then(done);
    })


    vfnSystemTest("Consumer side test: Service call failed test",  function(assert, argument){
        var done = assert.async(1);

        var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ['from vnf-endpoint: {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}']))
        .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"RESPONSE-FAIL","token":0,"reason":"error-reason-code"}))

        Promise.resolve()
        vnfEndpoint.call("root-endpoint", "test-method", "test-method-argument-1")
         .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, "error-reason-code", "asserting error reason");
        })
        .then(done);
    });

    vfnSystemTest("Consume side test: Service push test",  function(assert, argument){
        var done = assert.async(1);

        var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

        Promise.resolve()
        .then(vnfEndpoint.push.bind(null, "root-endpoint", "test-method", "test-method-argument-1"))
        .then(vnfEndpoint.push.bind(null, "root-endpoint", "test-method", "test-method-argument-2"))

        .then(argument.rootCapture.assertSignals.bind(null, ['from vnf-endpoint: {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from vnf-endpoint: {"type":"CALL","token":1,"method":"test-method","argument":"test-method-argument-2"}']))

        .then(done);
    })

    vfnSystemTest("Provider side test: Service call test",  function(assert, argument){
        var done = assert.async(1);

        function MockService(endpoint) {
            this.handlers = {
                "test-method": function(event) {
                    assert.equal(event.message,      "test-method-argument",   "asserting event message");
                    assert.equal(event.method,       "test-method",            "asserting event method");
                    assert.equal(event.sourceVIP,    "consumer-endpoint",      "asserting event sourceVIP");
                    assert.equal(event.endpoint,     endpoint,                 "asserting event endpoint");
                    assert.equal(event.endpoint.vip, "provider-endpoint".      "asserting event endpoint vip");

                    return event.message-echo;
                }
            }
        }

        argument.vnfSystem.registerService(MockService);

        var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

        Promise.resolve()
        .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}))
        .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"CALL","token":1,"method":"test-method","argument":"test-method-argument-2"}))
        .then(argument.rootCapture.assertSignals.bind(null, 'vnf-endpoint: {"type":"RESPONSE","token":0,"result":"test-method-argument-1-echo"}'))
        .then(argument.rootCapture.assertSignals.bind(null, 'vnf-endpoint: {"type":"RESPONSE","token":1,"result":"test-method-argument-2-echo"}'))
        .then(done);
    });

    vfnSystemTest("Provider side test: Service call async processing test",  function(assert, argument){
        var done = assert.async(1);

        function MockService(endpoint) {
            this.handlers = {
                "test-method": function(event) {
                    return Promise.resolve(event.message + "-echo");
                }
            }
        }

        argument.vnfSystem.registerService(MockService);

        var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

        Promise.resolve()
        .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}))
        .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"CALL","token":1,"method":"test-method","argument":"test-method-argument-2"}))
        .then(argument.rootCapture.assertSignals.bind(null, 'vnf-endpoint: {"type":"RESPONSE","token":0,"result":"test-method-argument-1-echo"}'))
        .then(argument.rootCapture.assertSignals.bind(null, 'vnf-endpoint: {"type":"RESPONSE","token":1,"result":"test-method-argument-2-echo"}'))
        .then(done);
    });


    vfnSystemTest("Provider side test: Service call failed: unknown method test",  function(assert, argument){
        var done = assert.async(1);

        var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

        Promise.resolve()
        .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}))
        .then(argument.rootCapture.assertSignals.bind(null, 'vnf-endpoint: {"type":"RESPONSE-FAIL","token":0,"reason":"CALL_FAILED_UNKNOWN_METHOD"}'))
        .then(done);

    });


    vfnSystemTest("Provider side test: Service call failed: unexpected error test",  function(assert, argument){
       var done = assert.async(1);

       function MockService(endpoint) {
           this.handlers = {
               "test-method": function(event) {
                   throw new Error("some-error-occurred");
               }
           }
       }

       argument.vnfSystem.registerService(MockService);

       var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

       Promise.resolve()
       .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}))
       .then(argument.rootCapture.assertSignals.bind(null, 'vnf-endpoint: {"type":"RESPONSE-FAIL","token":0,"reason":"CALL_FAILED_UNEXPECTED_EXCEPTION"}'))
       .then(done);
    });


    vfnSystemTest("Provider side test: Service call failed: controlled failure test",  function(assert, argument){
       var done = assert.async(1);

       function MockService(endpoint) {
           this.handlers = {
               "test-method": function(event) {
                   return new Error("fail-reason-code");
               }
           }
       }

       argument.vnfSystem.registerService(MockService);

       var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

       Promise.resolve()
       .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}))
       .then(argument.rootCapture.assertSignals.bind(null, 'vnf-endpoint: {"type":"RESPONSE-FAIL","token":0,"reason":"fail-reason-code"}'))
       .then(done);
    });

    vfnSystemTest("onConnectionLost test",  function(assert, argument){
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

        argument.vnfSystem.registerService(MockService);
        var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

        Promise.resolve()
        .then(argument.rootEndpoint.send.bind(null, "vnf-endpoint", {"type":"CALL","token":0,"method":"ping","argument":"no-arg"}))
        .then(argument.rootEndpoint.closeConnection.bind(null, "vnf-endpoint"))
        .then(captor.assertSignals.bind(null, ["connection-lost: root-endpoint"]))
        .then(done);
    });

    vfnSystemTest("Service call failed: failed due to connection lost test",  function(assert, argument){
        var done = assert.async(1);

        var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ['from vnf-endpoint: {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}']))
        .then(argument.rootEndpoint.closeConnection.bind(null, "vnf-endpoint"))

        Promise.resolve()
        vnfEndpoint.call("root-endpoint", "test-method", "test-method-argument-1")
         .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.FAILED_DUE_TO_CONNECTION_LOST, "asserting error reason");
        })
        .then(done);
    });

    vfnSystemTest("Service call failed: failed due to timeout test",  function(assert, argument){
        var done = assert.async(1);

        var vnfEndpoint = argument.vnfSystem.openEndpoint("vnf-endpoint");

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ['from vnf-endpoint: {"type":"CALL","token":0,"method":"test-method","argument":"test-method-argument-1"}']))
        .then(argument.rootEndpoint.closeConnection.bind(null, "vnf-endpoint"))

        Promise.resolve()
        vnfEndpoint.call("root-endpoint", "test-method", "test-method-argument-1")
         .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.REJECTED_BY_TIMEOUT, "asserting error reason");
        })
        .then(done);
    });
});

