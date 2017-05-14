requirejs(["vnf/vnf",
           "utils/signal-captor",
           "utils/logger",
           "test/utils/vnf-test-utils",
           "test/utils/websocket-rpc-test-utils",
           "lib/bluebird"],
function(  Vnf,
           SignalCaptor,
           Log,
           VnfTestUtils,
           WebSocketRpcTestUtils,
           Promise){

    function webSocketHubTest(description, callback) {
        VnfTestUtils.test("WebSocketHub", description, {}, function(assert, argument){

            argument.mockWebSocketFactory = new WebSocketRpcTestUtils.MockWebSocketFactory(assert);
            argument.webSocketCaptor = argument.mockWebSocketFactory.captor;

            var webSocketHub = new Vnf.WebSocketHub(argument.mockWebSocketFactory);
            argument.webSocketEndpoint = webSocketHub.openEndpoint("endpoint-vip");

            var webSocketRpc = argument.webSocketEndpoint.getWebSocketRpc();

            webSocketRpc.setBusyTimerInterval(200);
            webSocketRpc.setIdleTimerInterval(300);
            webSocketRpc.setLoginRecreateInterval(200)

            return callback(assert, argument);
        });
    }


    QUnit.module("WebSocketHub Tests");
    webSocketHubTest("Send string test", function(assert, argument){
        var done = assert.async(1);

        argument.webSocketEndpoint.send("endpoint-vip", "string-value");

        Promise.resolve()
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 SEND_TO_ENDPOINT\nendpoint-vip\nMESSAGE\nSstring-value"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT\nSUCCESS"))

        .then(done)
    })

    webSocketHubTest("Send json test", function(assert, argument){
        var done = assert.async(1);

        argument.webSocketEndpoint.send("endpoint-vip", {"json":"value"});

        Promise.resolve()
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 0 SEND_TO_ENDPOINT\nendpoint-vip\nMESSAGE\nJ{"json":"value"}']))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT\nSUCCESS"))

        .then(done);
    })

    webSocketHubTest("onMessage string test", function(assert, argument){
        var done = assert.async(1);

        argument.webSocketEndpoint.onMessage = function(event) {
            assert.equal(event.message, "endpoint-message", "verifying connection");
            assert.equal(event.sourceVip, "from-endpoint-vip", "verifying source");
            done()
        }

        Promise.resolve()
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 0))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nfrom-endpoint-vip\nMESSAGE\nSendpoint-message"))
    })

    webSocketHubTest("onMessage json test", function(assert, argument){
        var done = assert.async(1);

        argument.webSocketEndpoint.onMessage = function(event) {
            assert.deepEqual(event.message, {"json":"value"}, "verifying connection");
            assert.equal(event.sourceVip, "from-endpoint-vip", "verifying source");
            done()
        }

        Promise.resolve()
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 0))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, 'ENDPOINT_MESSAGE\nfrom-endpoint-vip\nMESSAGE\nJ{"json":"value"}'))
    })

    webSocketHubTest("Failover tests for malformed message", function(assert, argument){
        var done = assert.async(1);

        argument.webSocketEndpoint.onMessage = function(event) {
            assert.equal(event.message, "endpoint-message", "verifying connection");
            assert.equal(event.sourceVip, "from-endpoint-vip", "verifying source");
            done()
        }

        Promise.resolve()
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 0))

        // sending malformed message
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nfrom-endpoint-vipMESSAGESmalformed-message"))

        // sending regular message
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nfrom-endpoint-vip\nMESSAGE\nSendpoint-message"))
    })


    webSocketHubTest("isConnected test", function(assert, argument){

        assert.notOk(argument.webSocketEndpoint.isConnected("external-endpoint-vip"), "verifying before send");

        argument.webSocketEndpoint.send("external-endpoint-vip", "message");

        assert.ok(argument.webSocketEndpoint.isConnected("external-endpoint-vip"), "verifying after send");

        argument.webSocketEndpoint.closeConnection("external-endpoint-vip", "message");

        assert.notOk(argument.webSocketEndpoint.isConnected("external-endpoint-vip"), "verifying after closeConnection");
    })

    webSocketHubTest("closeConnection test", function(assert, argument){
        var done = assert.async(1);

        argument.webSocketEndpoint.send("external-endpoint-vip", "establish-connection");

        Promise.resolve()
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 0 SEND_TO_ENDPOINT\nexternal-endpoint-vip\nMESSAGE\nSestablish-connection']))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT\nSUCCESS"))

        .then(argument.webSocketEndpoint.closeConnection.bind(null, "external-endpoint-vip"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 2 SEND_TO_ENDPOINT\nexternal-endpoint-vip\nCLOSE-CONNECTION']))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 SEND_TO_ENDPOINT\nSUCCESS"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 PING"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 PING"))

        .then(done)
    })

    webSocketHubTest("destroy test", function(assert, argument){
        var done = assert.async(1);

        argument.webSocketEndpoint.send("vip-1", "message-1")
        argument.webSocketEndpoint.send("vip-2", "message-2")

        Promise.resolve()
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 2))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 0 SEND_TO_ENDPOINT\nvip-1\nMESSAGE\nSmessage-1']))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 1 SEND_TO_ENDPOINT\nvip-2\nMESSAGE\nSmessage-2']))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT\nSUCCESS"))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 SEND_TO_ENDPOINT\nSUCCESS"))

        .then(argument.webSocketEndpoint.destroy.bind("external-endpoint-vip"))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 3 SEND_TO_ENDPOINT\nvip-1\nCLOSE-CONNECTION']))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 4 SEND_TO_ENDPOINT\nvip-2\nCLOSE-CONNECTION']))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 SEND_TO_ENDPOINT\nSUCCESS"))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "4 SEND_TO_ENDPOINT\nSUCCESS"))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))

        .then(done)
    })


    webSocketHubTest("onConnectionClose by closeConnection test", function(assert, argument){
        var done = assert.async(1);

        argument.webSocketEndpoint.onConnectionLost(function(targetVip){
            assert.equal(targetVip, "external-vip");
            done();
        })

        Promise.resolve()
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 0))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nexternal-vip\nCLOSE-CONNECTION"))
    })

    webSocketHubTest("Test retry", function(assert, argument){
        var done = assert.async(1);

        argument.webSocketEndpoint.send("target-endpoint-vip", "string-value");
        argument.webSocketEndpoint.closeConnection("target-endpoint-vip");

        Promise.resolve()
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 2))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 0 SEND_TO_ENDPOINT\ntarget-endpoint-vip\nMESSAGE\nSstring-value']))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 1 SEND_TO_ENDPOINT\ntarget-endpoint-vip\nCLOSE-CONNECTION']))

        .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
        .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 3))

        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 0 SEND_TO_ENDPOINT\ntarget-endpoint-vip\nMESSAGE\nSstring-value']))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 1 SEND_TO_ENDPOINT\ntarget-endpoint-vip\nCLOSE-CONNECTION']))

        .then(done);
    });
})