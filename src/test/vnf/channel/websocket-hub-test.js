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

    function webSocketHubTest(description, callback) {
        argument.
    }

    function doLogin(argument) {
        return Promise.resolve()
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    }


    QUnit.module("WebSocketHub Tests");
    webSocketTest("Send string test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketEndpoint.send("endpoint-vip", "string-value");

        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 1 SEND_TO_ENDPOINT\nendpoint-vip\nMESSAGE\nSstring-value"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 SEND_TO_ENDPOINT\nSUCCESS"))

        .then(done)
    })

    webSocketTest("Send json test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketEndpoint.send("endpoint-1", {"json":"value"});

        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCapture.assertSignals.bind(null, ['message: 1 SEND_TO_ENDPOINT\nendpoint-vip\nMESSAGE\nJ{"json":"value"}']))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 SEND_TO_ENDPOINT\nSUCCESS"))

        .then(done)
    })

    webSocketTest("onMessage string test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketEndpoint.onMessage = function(event) {
            assert.equal(event.message, "endpoint-message", "verifying connection");
            assert.equal(event.sourceVIP, "from-endpoint-vip", "verifying source");
            done()
        }

        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 ENDPOINT_MESSAGE\nfrom-endpoint-vip\nMESSAGE\nSendpoint-message"))
    })

    webSocketTest("onMessage json test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketEndpoint.onMessage = function(event) {
            assert.deepEqual(event.message, {"json":"value"}, "verifying connection");
            assert.equal(event.sourceVIP, "from-endpoint-vip", "verifying source");
            done()
        }

        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, '1 ENDPOINT_MESSAGE\nfrom-endpoint-vip\nMESSAGE\nJ{"json":"value"}'))

        .then(done)
    })



    webSocketTest("isConnected test", function(assert, argument){


        assert.notOk(argument.webSocketEndpoint.isConnected("external-endpoint-vip"), "verifying before send");

        argument.webSocketEndpoint.send("external-endpoint-vip", "message");

        assert.ok(argument.webSocketEndpoint.isConnected("external-endpoint-vip"), "verifying after send");

        argument.webSocketEndpoint.closeConnection("external-endpoint-vip", "message");

        assert.notOk(argument.webSocketEndpoint.isConnected("external-endpoint-vip"), "verifying after closeConnection");
    })

    webSocketTest("closeConnection test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketEndpoint.closeConnection.bind("external-endpoint-vip"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ['message: 1 SEND_TO_ENDPOINT\nendpoint-vip\nCLOSE-CONNECTION']))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["message: 2 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 PING"))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 SEND_TO_ENDPOINT\nSUCCESS"))

        .then(done)
    })

    webSocketTest("destroy test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketEndpoint.send("vip-1", "message-1")
        argument.webSocketEndpoint.send("vip-2", "message-2")

        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCapture.assertSignals.bind(null, ['message: 1 SEND_TO_ENDPOINT\nvip-1\nMESSAGE\nSmessage-1']))
        .then(argument.webSocketCapture.assertSignals.bind(null, ['message: 2 SEND_TO_ENDPOINT\nvip-2\nMESSAGE\nSmessage-2']))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 SEND_TO_ENDPOINT\nSUCCESS"))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 SEND_TO_ENDPOINT\nSUCCESS"))

        .then(argument.webSocketEndpoint.destroy.bind("external-endpoint-vip"))
        .then(argument.webSocketCapture.assertSignals.bind(null, ['message: 3 SEND_TO_ENDPOINT\nvip-1\nCLOSE-CONNECTION']))
        .then(argument.webSocketCapture.assertSignals.bind(null, ['message: 4 SEND_TO_ENDPOINT\nvip-2\nCLOSE-CONNECTION']))
        .then(argument.webSocketCapture.assertSignals.bind(null, ["destroy"]))

        .then(done)
    })


    webSocketTest("onConnectionClose by closeConnection test", function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();

        argument.webSocketEndpoint.onConnectionLost(function(targetVIP){
            assert.equal(targetVIP, "external-vip");
            done();
        })

        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 ENDPOINT_MESSAGE\nexternal-vip\nCLOSE-CONNECTION"))
    })
})