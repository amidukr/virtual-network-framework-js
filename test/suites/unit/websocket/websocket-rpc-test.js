import {SignalCaptor} from "../../../../src/utils/signal-captor.js";
import {Log}          from "../../../../src/utils/logger.js";

import {VnfTestUtils}          from "../../../utils/vnf-test-utils.js";
import {WebSocketRpcTestUtils} from "../../../utils/websocket-rpc-test-utils.js";

import {Vnf} from "../../../../src/vnf/vnf.js";

function webSocketTest(description, callback) {

    VnfTestUtils.test("WebSocketTest", description, {}, function(assert, argument){
        WebSocketRpcTestUtils.setupWebSocketRpcMocks(assert, argument)

        return callback(assert, argument);
    });

    VnfTestUtils.test("WebSocketTest", "Exception failover: "+ description, {}, function(assert, argument){
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 INVOKE-TEST-COMMAND\nMy\ntest\ndata-2"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 INVOKE-TEST-COMMAND\nresponse\nto call - 1"))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-COMMAND\nresponse\nto call - 0"))


    Promise.all([argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1"),
                 argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-2")])

    .then(function(responseEvents){
        assert.equal(responseEvents[0].data,    "response\nto call - 0", "asserting call-0 response data")
        assert.equal(responseEvents[0].command, "INVOKE-TEST-COMMAND",   "asserting call-0 response command")
        assert.equal(responseEvents[0].callId,  "1",                     "asserting call-0 response callId")

        assert.equal(responseEvents[1].data,    "response\nto call - 1", "asserting call-1 response data")
        assert.equal(responseEvents[1].command, "INVOKE-TEST-COMMAND",   "asserting call-1 response command")
        assert.equal(responseEvents[1].callId,  "2",                     "asserting call-1 response callId")
    })

    .then(done);
});

webSocketTest("Deferred calls after onopen test", function(assert, argument){
    var done = assert.async(1);


    Promise.resolve()
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-2"]))

    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 INVOKE-TEST-COMMAND\nresponse\nto deferred call - 0"))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-COMMAND\nresponse\nto deferred call - 1"))



    var callPromises = []

    callPromises[0] = argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1");
    callPromises[1] = argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-2");

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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-COMMAND"))


    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND")
    .then(function(responseEvents){
        assert.equal(responseEvents.data, null, "asserting null response data")
    })

    .then(done);
});

webSocketTest("Push test", function(assert, argument){
    var done = assert.async(3);

    argument.mockWebSocketFactory.fireOnopen();

    var i = 0;

    argument.webSocketRpc.registerPushHandler("PUSH-TEST-COMMAND", function(event){
        i++;
        assert.equal(event.data,    "push\ntest\ndata-" + i)
        assert.equal(event.command, "PUSH-TEST-COMMAND")

        done();
    })

    Promise.resolve()
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(function(){
        argument.mockWebSocketFactory.fireOnmessage("PUSH-TEST-COMMAND\npush\ntest\ndata-1");
        argument.mockWebSocketFactory.fireOnmessage("PUSH-TEST-COMMAND\npush\ntest\ndata-2");
        argument.mockWebSocketFactory.fireOnmessage("PUSH-TEST-COMMAND\npush\ntest\ndata-3");
    })
});

webSocketTest("Correct handling for multiple responses for single call", function(assert, argument){
    var done = assert.async(1);

    argument.mockWebSocketFactory.fireOnopen();

    Promise.resolve()
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(function(){
        argument.mockWebSocketFactory.fireOnmessage("1 INVOKE-TEST-COMMAND\nfirst response");
        argument.mockWebSocketFactory.fireOnmessage("1 INVOKE-TEST-COMMAND\nsecond response");
    });


    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1")
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))


    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nws-endpoint"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "4 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-COMMAND\nfirst response"));


    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1", {retryResend: true})
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))

    //... timeout ...

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(function(){mockWebSocket.fireOnclose()})
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(function(){mockWebSocket = argument.mockWebSocketFactory.getMockWebSocket()})
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))

    //... timeout ...

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(function(){mockWebSocket.fireOnclose()})
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(function(){mockWebSocket = argument.mockWebSocketFactory.getMockWebSocket()})
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-COMMAND\nsuccessful-response"));


    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1", {retryResend: true})
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))

    //... timeout ...

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(function(){mockWebSocket.fireOnclose()})
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-COMMAND\nsuccessful-response"))

    .then(function(){
        return Promise.all([argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND-2", "My\ntest\ndata-2"),
                            Promise.resolve()
                                .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 INVOKE-TEST-COMMAND-2\nMy\ntest\ndata-2"]))
                                .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 INVOKE-TEST-COMMAND-2\nsuccessful-response-2"))
                            ])
                .then(function(argument){
                    assert.equal(argument[0].data, "successful-response-2", "Asserting seocnd call response data")
                })
    })


    .then(done);


    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1", {retryResend: true})
    .then(function(responseEvent){
        assert.equal(responseEvent.data, "successful-response", "Asserting call response dat")
    })


});

webSocketTest("Recreate websocket after call timeout - busy case - no onclose event", function(assert, argument){

    var done = assert.async(1);

    argument.mockWebSocketFactory.fireOnopen();

    Promise.resolve()
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))

    //... timeout ...

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))

    //... timeout ...

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-COMMAND\nsuccessful-response"));


    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1", {retryResend: true})
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nws-endpoint"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "4 LOGIN\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-COMMAND\nfirst response"));


    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1", {retryResend: true})
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 INVOKE-TEST-COMMAND\nresponse\nto call - 0"))


    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1", {retryResend: true})
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["webSocketRpc-onConnectionOpen"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["webSocketRpc-onConnectionOpen"]))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 PING"]))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 LOGIN\nws-endpoint"]))
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 PING"]))

    //... timeout ...

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))


    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))
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


    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 5 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "5 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 PING"]))

    //... timeout ...

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 6 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "6 LOGIN\nOK"))


    .then(function(){
        return Promise.all([argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND-2", "My\ntest\ndata-2"),
                            Promise.resolve()
                                .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 PING"]))
                                .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 7 INVOKE-TEST-COMMAND-2\nMy\ntest\ndata-2"]))
                                .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "7 INVOKE-TEST-COMMAND-2\nsuccessful-response-after-reconnects"))
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nALREADY_USED"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))


    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 LOGIN\nALREADY_USED"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))

    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1")
    .then(function(){
        assert.notOk("call fulfilled, while rejection by timeout is exepcted");
    },
    function(reason){
        assert.equal(reason, Vnf.Global.REJECTED_BY_TIMEOUT, "asserting call rejection reason");
    })
    .then(done)
});

webSocketTest("Error handling for failure message from server", function(assert, argument){
    var done = assert.async(1);

    argument.mockWebSocketFactory.fireOnopen();

    Promise.resolve()
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-FAIL-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "CALL_ERROR\n1 INVOKE-FAIL-COMMAND\nSERVER_SIDE_FAILURE_CODE"))

    argument.webSocketRpc.invoke("INVOKE-FAIL-COMMAND", "My\ntest\ndata-1")
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
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 INVOKE-TEST-COMMAND\nMy\ntest\ndata-1"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 INVOKE-TEST-COMMAND\nMy\ntest\ndata for retry"]))
    .then(argument.webSocketRpc.destroy.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "PUSH-COMMAND\nargument"))
    .then(argument.webSocketRpc.invoke.bind("INVOKE-TEST-COMMAND", "My\ntest\ndata-2"))
    .then(function(evt){
        assert.notOk("Web socket should be destroyed, successful response instead" + evt);
    },
    function(reason){
        assert.equal(reason, Vnf.Global.INSTANCE_DESTROYED, "asserting call rejection reason - called after destroy");
    })
    .then(argument.webSocketCaptor.assertSilence.bind(null, 600))
    .then(done);

    argument.webSocketRpc.registerPushHandler("PUSH-COMMAND", function(){
        assert.notOk("Push handler shouldn't be invoked for destroy webrpc");
    });

    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata-1")
    .then(function(evt){
        assert.notOk("Silence is expected after destroy, but resolved with" + evt);
    },
    function(reason){
        assert.equal(reason, Vnf.Global.INSTANCE_DESTROYED, "asserting call rejection reason - called before destroy");
    })
    .then(done);

    argument.webSocketRpc.invoke("INVOKE-TEST-COMMAND", "My\ntest\ndata for retry", {retryResend: true})
    .then(function(evt){
        assert.notOk("Silence is expected after destroy, but resolved with" + evt);
    },
    function(reason){
        assert.equal(reason, Vnf.Global.INSTANCE_DESTROYED, "asserting call rejection reason - called before destroy - with retry");
    })
    .then(done);
});

webSocketTest("Destroy test - idle test", function(assert, argument){
    var done = assert.async(1);

    argument.mockWebSocketFactory.fireOnopen();

    Promise.resolve()
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    .then(argument.webSocketRpc.destroy.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(argument.webSocketCaptor.assertSilence.bind(null, 600))

    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(argument.webSocketCaptor.assertSilence.bind(null, 600))

    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSilence.bind(null, 600))
    .then(done);
});

webSocketTest("Should Invoke command only after successful login", function(assert, argument){
    var done = assert.async(1);

    argument.webSocketRpc.invoke("INVOKE-SOME-COMMAND", "My\ntest\ndata for retry", {retryResend: true})

    Promise.resolve()
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 LOGIN\nALREADY_USED"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))


    .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
    .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 LOGIN\nws-endpoint"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 LOGIN\nOK"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 INVOKE-SOME-COMMAND\nMy\ntest\ndata for retry"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))
    .then(done);
});
