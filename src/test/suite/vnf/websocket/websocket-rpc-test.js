requirejs(["vnf/vnf",
           "utils/signal-captor",
           "utils/logger",
           "test/utils/vnf-test-utils",
           "test/utils/websocket-rpc-test-utils",
           "lib/bluebird"],
function(  VNF,
           SignalCaptor,
           Log,
           VNFTestUtils,
           WebSocketRpcTestUtils,
           Promise){

    function webSocketTest(description, callback) {

        VNFTestUtils.test("WebSocketTest", description, {}, function(assert, argument){
            WebSocketRpcTestUtils.setupWebSocketRpcMocks(assert, argument)

            return callback(assert, argument);
        });

        VNFTestUtils.test("WebSocketTest", "Exception failover: "+ description, {}, function(assert, argument){
            WebSocketRpcTestUtils.setupWebSocketRpcMocks(assert, argument)

            argument.mockWebSocketFactory.setExceptionOnCall("Testing unexpected exception fail-overs");

            return callback(assert, argument);
        });
    }

    QUnit.module("WebSocket Tests");
    webSocketTest("Call test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 INVOKE-TEST-METHOD\nMy\ntest\ndata-2"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 INVOKE-TEST-METHOD\nresponse\nto call - 1"))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nresponse\nto call - 0"))


        Promise.all([argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1"),
                     argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-2")])

        .then(function(responseEvents){
            assert.equal(responseEvents[0].data, "response\nto call - 0",  "asserting call-0 response data")
            assert.equal(responseEvents[0].method, "INVOKE-TEST-METHOD",   "asserting call-0 response method")
            assert.equal(responseEvents[0].callId, "1",                    "asserting call-0 response callId")

            assert.equal(responseEvents[1].data, "response\nto call - 1",  "asserting call-1 response data")
            assert.equal(responseEvents[1].method, "INVOKE-TEST-METHOD",   "asserting call-1 response method")
            assert.equal(responseEvents[1].callId, "2",                    "asserting call-1 response callId")
        })

        .then(done);
    });

    webSocketTest("Deferred calls after onopen test", function(assert, argument){
        var done = assert.async(1);


        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-2"]))

        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 INVOKE-TEST-METHOD\nresponse\nto deferred call - 0"))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nresponse\nto deferred call - 1"))



        var callPromises = []

        callPromises[0] = argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1");
        callPromises[1] = argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-2");

        argument.mockWebSocketFactory.fireOnopen();

        Promise.all(callPromises)
        .then(function(responseEvents){
            assert.equal(responseEvents[0].data, "response\nto deferred call - 0",  "asserting call-0 response data")
            assert.equal(responseEvents[1].data, "response\nto deferred call - 1",  "asserting call-1 response data")
        })

        .then(done);
    });

    webSocketTest("Call null message test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD"))


        argument.webSocketRpc.call("INVOKE-TEST-METHOD")
        .then(function(responseEvents){
            assert.equal(responseEvents.data, null, "asserting null response data")
        })

        .then(done);
    });

    webSocketTest("Push test", function(assert, argument){
        var done = assert.async(3);

        argument.mockWebSocketFactory.fireOnopen();

        var i = 0;

        argument.webSocketRpc.registerPushHandler("PUSH-TEST-METHOD", function(event){
            i++;
            assert.equal(event.data, "push\ntest\ndata-" + i)
            assert.equal(event.method, "PUSH-TEST-METHOD")

            done();
        })

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(function(){
            argument.mockWebSocketFactory.fireOnmessage("PUSH-TEST-METHOD\npush\ntest\ndata-1");
            argument.mockWebSocketFactory.fireOnmessage("PUSH-TEST-METHOD\npush\ntest\ndata-2");
            argument.mockWebSocketFactory.fireOnmessage("PUSH-TEST-METHOD\npush\ntest\ndata-3");
        })
    });

    webSocketTest("Correct handling for multiple responses for single call", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(function(){
            argument.mockWebSocketFactory.fireOnmessage("1 INVOKE-TEST-METHOD\nfirst response");
            argument.mockWebSocketFactory.fireOnmessage("1 INVOKE-TEST-METHOD\nsecond response");
        });


        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1")
        .then(function(responseEvent){
            assert.equal(responseEvent.data, "first response", "Asserting call response dat")
        })

        .then(done);
    });

    webSocketTest("Recreate websocket after onclose event", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))


        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nendpoint-vip"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "4 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nfirst response"));


        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1", {retryResend: true})
        .then(function(responseEvent){
            assert.equal(responseEvent.data, "first response", "Asserting call response dat")
        })

        .then(done);
    });

    webSocketTest("Recreate websocket after call timeout - busy case", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        var mockWebSocket = null;

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(function(){mockWebSocket = argument.mockWebSocketFactory.getMockWebSocket()})
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(function(){mockWebSocket.fireOnclose()})
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(function(){mockWebSocket = argument.mockWebSocketFactory.getMockWebSocket()})
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(function(){mockWebSocket.fireOnclose()})
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(function(){mockWebSocket = argument.mockWebSocketFactory.getMockWebSocket()})
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nsuccessful-response"));


        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1", {retryResend: true})
        .then(function(responseEvent){
            assert.equal(responseEvent.data, "successful-response", "Asserting call response dat")
        })

        .then(done);
    });

    webSocketTest("Recreate websocket after call timeout - busy case - onclose event after establish", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        var mockWebSocket = null;

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(function(){mockWebSocket = argument.mockWebSocketFactory.getMockWebSocket()})
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(function(){mockWebSocket.fireOnclose()})
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nsuccessful-response"))

        .then(function(){
            return Promise.all([argument.webSocketRpc.call("INVOKE-TEST-METHOD-2", "My\ntest\ndata-2"),
                                Promise.resolve()
                                    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 INVOKE-TEST-METHOD-2\nMy\ntest\ndata-2"]))
                                    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 INVOKE-TEST-METHOD-2\nsuccessful-response-2"))
                                ])
                    .then(function(argument){
                        assert.equal(argument[0].data, "successful-response-2", "Asserting seocnd call response data")
                    })
        })


        .then(done);


        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1", {retryResend: true})
        .then(function(responseEvent){
            assert.equal(responseEvent.data, "successful-response", "Asserting call response dat")
        })


    });

    webSocketTest("Recreate websocket after call timeout - busy case - no onclose event", function(assert, argument){

        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nsuccessful-response"));


        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1", {retryResend: true})
        .then(function(responseEvent){
            assert.equal(responseEvent.data, "successful-response", "Asserting call response dat")
        })

        .then(done);
    });

    webSocketTest("No retries for LOGIN request", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nendpoint-vip"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "4 LOGIN\nOK"))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nfirst response"));


        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1", {retryResend: true})
        .then(function(responseEvent){
            assert.equal(responseEvent.data, "first response", "Asserting call response dat")
        })

        .then(done);
    });

    webSocketTest("Multiple Retries after multiple reconnects", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nresponse\nto call - 0"))


        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1", {retryResend: true})
        .then(function(responseEvent){
            assert.equal(responseEvent.data, "response\nto call - 0",  "asserting call-0 response data after retries")
        })

        .then(done);
    });

    webSocketTest("On reconnect event", function(assert, argument){
        var done = assert.async(1);



        argument.webSocketRpc.onConnectionOpen(function(){
            argument.webSocketCaptor.signal("webSocketRpc-onConnectionOpen");
        })

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["webSocketRpc-onConnectionOpen"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["webSocketRpc-onConnectionOpen"]))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["webSocketRpc-onConnectionOpen"]))

        .then(done);
    });

    webSocketTest("verifyConnection - manual call test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketRpc.verifyConnection();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 PING"))

        .then(argument.webSocketRpc.verifyConnection.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 PING"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 PING"))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 PING"]))
        .then(done)
    });

    webSocketTest("Ping-Pong failed - reconnect cycle test", function(assert, argument){

        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketRpc.verifyConnection();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 PING"]))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 PING"))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "4 PING"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 5 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "5 PING"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 6 PING"]))

        .then(done)
    });


    webSocketTest("Ping-Pong reconnection after silence detected test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 PING"]))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))


        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 PING"))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 PING"))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 PING"]))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))


        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 5 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "5 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 PING"]))

        //... timeout ...

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 6 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "6 LOGIN\nOK"))


        .then(function(){
            return Promise.all([argument.webSocketRpc.call("INVOKE-TEST-METHOD-2", "My\ntest\ndata-2"),
                                Promise.resolve()
                                    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 7 INVOKE-TEST-METHOD-2\nMy\ntest\ndata-2"]))
                                    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "7 INVOKE-TEST-METHOD-2\nsuccessful-response-after-reconnects"))
                                ])
                    .then(function(argument){
                        assert.equal(argument[0].data, "successful-response-after-reconnects", "Asserting seocnd call response data")
                    })
        })

        .then(done)
    });

    webSocketTest("Login already used test", function(assert, argument){
        var done = assert.async(1);

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nALREADY_USED"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))


        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 LOGIN\nALREADY_USED"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 PING"))

        .then(done)
    });

    webSocketTest("Failure due timeout test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))

        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1")
        .then(function(){
            assert.notOk("call fulfilled, while rejection by timeout is exepcted");
        },
        function(reason){
            assert.equal(reason, VNF.Global.REJECTED_BY_TIMEOUT, "asserting call rejection reason");
        })
        .then(done)
    });

    webSocketTest("Error handling for failure message from server", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-FAIL-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "CALL_ERROR\n1 INVOKE-FAIL-METHOD\nSERVER_SIDE_FAILURE_CODE"))

        argument.webSocketRpc.call("INVOKE-FAIL-METHOD", "My\ntest\ndata-1")
        .then(function(){
            assert.notOk("call fulfilled, while rejection by timeout is exepcted");
        },
        function(reason){
            assert.equal(reason, "SERVER_SIDE_FAILURE_CODE", "asserting call rejection reason");
        })
        .then(done)
    });

    webSocketTest("Destroy test", function(assert, argument){
        var done = assert.async(3);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 INVOKE-TEST-METHOD\nMy\ntest\ndata for retry"]))
        .then(argument.webSocketRpc.destroy.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "PUSH-METHOD\nargument"))
        .then(argument.webSocketRpc.call.bind("INVOKE-TEST-METHOD", "My\ntest\ndata-2"))
        .then(function(evt){
            assert.notOk("Web socket should be destroyed, successful response instead" + evt);
        },
        function(reason){
            assert.equal(reason, VNF.Global.INSTANCE_DESTROYED, "asserting call rejection reason - called after destroy");
        })
        .then(argument.webSocketCaptor.assertSilence.bind(null, 600))
        .then(done);

        argument.webSocketRpc.registerPushHandler("PUSH-METHOD", function(){
            assert.notOk("Push handler shouldn't be invoked for destroy webrpc");
        });

        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1")
        .then(function(evt){
            assert.notOk("Silence is expected after destroy, but resolved with" + evt);
        },
        function(reason){
            assert.equal(reason, VNF.Global.INSTANCE_DESTROYED, "asserting call rejection reason - called before destroy");
        })
        .then(done);

        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata for retry", {retryResend: true})
        .then(function(evt){
            assert.notOk("Silence is expected after destroy, but resolved with" + evt);
        },
        function(reason){
            assert.equal(reason, VNF.Global.INSTANCE_DESTROYED, "asserting call rejection reason - called before destroy - with retry");
        })
        .then(done);
    });

    webSocketTest("Destroy test - idle test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketRpc.destroy.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
        .then(argument.webSocketCaptor.assertSilence.bind(null, 600))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(argument.webSocketCaptor.assertSilence.bind(null, 600))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSilence.bind(null, 600))
        .then(done);
    })
});


