requirejs(["vnf/vnf",
           "vnf/global"
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

    function mockWebSocketFactory() {
        return {

        }
    }

    function webSocketTest(description, callback) {
        return VNFTestUtils.test("WebSocketTest", description, {}+, function(assert, argument){
            argument.mockWebSocketFactory = mockWebSocketFactory();
            argument.webSocketRpc = new VNF.WebSocketRpc("endpoint-vip", argument.mockWebSocketFactory);
            argument.webSocketCapture = mockWebSocketFactory.capture;

            return callback(assert, argument);
        });
    }

    QUnit.module("WebSocket Tests");
    webSocketTest("Call test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();



        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 2 INVOKE-TEST-METHOD\nMy\ntest\ndata-2"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nresponse\nto call - 1"))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 INVOKE-TEST-METHOD\nresponse\nto call - 0"))


        Promise.all(argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1"),
                    argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-2"))

        .then(function(responseEvents){
            assert.equal(responseEvents[0].data, "response\nto call - 0",  "asserting call-0 response data")
            assert.equal(responseEvents[0].method, "INVOKE-TEST-METHOD",   "asserting call-0 response method")
            assert.equal(responseEvents[0].callId, "1",                    "asserting call-0 response callId")

            assert.equal(responseEvents[1].data, "response\nto call - 1",  "asserting call-1 response data")
            assert.equal(responseEvents[1].method, "INVOKE-TEST-METHOD",   "asserting call-1 response method")
            assert.equal(responseEvents[1].callId, "2",                    "asserting call-1 response callId")
        })

        .then(done);
    })

    webSocketTest("Call null message test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD"))


        argument.webSocketRpc.call("INVOKE-TEST-METHOD")
        .then(function(responseEvents){
            assert.equal(responseEvents[0].data, null, "asserting null response data")
        });

        var done = assert.async(1);
    })

    webSocketTest("Push test", function(assert, argument){
        var done = assert.async(3);

        argument.mockWebSocketFactory.fireOnopen();

        var i = 0;

        argument.webSocketRpc.registerPushHandler("PUSH-TEST-METHOD", function(event){
            i++;
            assert.equal(responseEvents[0].data, "push\ntest\ndata-" + i)
            assert.equal(responseEvents[0].method, "PUSH-TEST-METHOD")

            done();
        })

        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(function(){
            argument.mockWebSocketFactory.fireOnmessage("PUSH-TEST-METHOD\npush\ntest\ndata-1");
            argument.mockWebSocketFactory.fireOnmessage("PUSH-TEST-METHOD\npush\ntest\ndata-2");
            argument.mockWebSocketFactory.fireOnmessage("PUSH-TEST-METHOD\npush\ntest\ndata-3");
        })
    })

    webSocketTest("Correct handling for multiple responses for single call", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(function(){
            argument.mockWebSocketFactory.fireOnmessage("1 INVOKE-TEST-METHOD\nfirst response");
            argument.mockWebSocketFactory.fireOnmessage("1 INVOKE-TEST-METHOD\nsecond response");
        });


        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1")
        .then(function(responseEvent){
            assert.equal(responseEvents.data, "first response", "Asserting call response dat")
        })

        .then(done);
    })



    webSocketTest("Deferred calls after onopen test", function(assert, argument){
        var done = assert.async(1);


        .then(argument.webSocketCapture.assertSilence.bind([null, 600]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))

        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 2 INVOKE-TEST-METHOD\nMy\ntest\ndata-2"]))

        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-METHOD\nresponse\nto deferred call - 0"))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 INVOKE-TEST-METHOD\nresponse\nto deferred call - 1"))



        Promise.all(argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1"),
                    argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-2"))
        .then(function(responseEvents){
            assert.equal(responseEvents[0].data, "response\nto deferred call - 0",  "asserting call-0 response data")
            assert.equal(responseEvents[1].data, "response\nto deferred call - 1",  "asserting call-1 response data")
        })

        .then(done);
    })

    webSocketTest("Retries after reconnects", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 INVOKE-TEST-METHOD\nresponse\nto call - 1"))


        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1")
        .then(function(responseEvent){
            assert.equal(responseEvents.data, "response\nto call - 0",  "asserting call-0 response data after retries")
        })

        .then(done);
    });

    webSocketTest("On reconnect event", function(assert, argument){
        var done = assert.async(3);

        var i = 0;

        argument.webSocketCapture.registerConnectionInitializer(function(){
            i++;
            assert.ok("Initializer called - " + i);
            done();
        })

        Promise.resolve()
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 LOGIN\nOK"))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 LOGIN\nOK"))
    })

    webSocketTest("ping-pong succeed - no reconnect cycle test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketRpc.verifyConnection();

        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 PING"))

        .then(argument.webSocketRpc.verifyConnection.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 2 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 PING"))


        .then(argument.webSocketCapture.assertSilence.bind([null, 600]))
        .then(done)
    })

    webSocketTest("ping-pong failed - reconnect cycle test", function(assert, argument){

        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketRpc.verifyConnection();

        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 PING"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["destroy"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["new websocket"]))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["destroy"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["new websocket"]))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 3 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 PING"))

        .then(argument.webSocketCapture.assertSilence.bind([null, 600]))

        .then(done)
    })

    webSocketTest("Failure due timeout test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))

        argument.webSocketRpc.call("INVOKE-TEST-METHOD", "My\ntest\ndata-1")
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 INVOKE-TEST-METHOD\nMy\ntest\ndata-1"]))
        .then(function(){
            assert.notOk("call fulfilled, while rejection by timeout is exepcted");
        },
        function(reason){
            assert.equal(reason, Global.REJECTED_BY_TIMEOUT, "asserting call rejection reason");
        })
        .then(done)
    })


    webSocketTest("ping-pong reconnection after silence detected test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 PING"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["destroy"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["new websocket"]))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 3 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 PING"))

        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 4 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "4 PING"))

        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 5 PING"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["destroy"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["new websocket"]))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 6 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "6 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 5 PING"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["destroy"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["new websocket"]))

        .then(done)
    })

    webSocketTest("login already used test test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nALREADY_USED"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["destroy"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["new websocket"]))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 LOGIN\nALREADY_USED"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["destroy"]))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["new websocket"]))

        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 2 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 3 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 PING"))

        .then(done)
    });
});


