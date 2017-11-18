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

    /*
       Test that verifies integration with VNF Server for sending data to destroyed endpoint
       VNF Server should return error in this case
    */
    VnfTestUtils.test("WebSocketHub-Integration", "closeConnection after send failed integration test", function(assert){
        var done = assert.async(1);

        var webSocketFactory = new Vnf.WebSocketFactory(TestingProfiles.getValue(null, "vnfWebSocketUrl"));
        var webSocketRpc = new Vnf.WebSocketRpc("manual-rpc-endpoint", webSocketFactory);

        var captor = new SignalCaptor(assert);

        webSocketRpc.registerPushHandler("ENDPOINT_MESSAGE", function(event){
            captor.signal("message: " + event.data);
        });

        var hub = new Vnf.WebSocketHub(webSocketFactory);
        var endpoint = hub.openEndpoint("ws-endpoint");

        endpoint.openConnection("manual-rpc-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            endpoint.send("manual-rpc-endpoint", "my-test-message-1");
        });

        endpoint.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(captor, "reliable-endpoint"));

        Promise.resolve()
        .then(captor.assertSignals.bind(null, ["message: ws-endpoint\nHANDSHAKE"]))
        .then(webSocketRpc.invoke.bind(null, "SEND_TO_ENDPOINT", "ws-endpoint\nACCEPT", {retryResend: true}))

        .then(captor.assertSignals.bind(null, ["message: ws-endpoint\nMESSAGE\nmy-test-message-1"]))

        .then(endpoint.send.bind(null, "manual-rpc-endpoint", "my-test-message-2"))
        .then(captor.assertSignals.bind(null, ["message: ws-endpoint\nMESSAGE\nmy-test-message-2"]))
        .then(webSocketRpc.destroy)
        .delay(100)
        .then(endpoint.send.bind(null, "manual-rpc-endpoint", "my-test-message-3"))
        .then(captor.assertSignals.bind(null, ["from manual-rpc-endpoint connection lost"]))

        .then(endpoint.destroy)
        .then(done);
    });
});
