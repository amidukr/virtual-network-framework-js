define(["vnf/vnf",
           "utils/signal-captor",
           "test/utils/vnf-test-utils",
           "test/utils/websocket-rpc-test-utils",
           "utils/signal-captor"],
function(  Vnf,
           Log,
           VnfTestUtils,
           WebSocketRpcTestUtils,
           SignalCaptor){

    function webSocketHubTest(description, callback) {
        VnfTestUtils.test("WebSocketHub", description, {}, function(assert, argument){

            argument.mockWebSocketFactory = new WebSocketRpcTestUtils.MockWebSocketFactory(assert);
            argument.webSocketCaptor = argument.mockWebSocketFactory.captor;

            argument.webSocketHub = new Vnf.WebSocketHub(argument.mockWebSocketFactory);
            argument.webSocketEndpoint = argument.webSocketHub.openEndpoint("ws-endpoint");
            argument.webSocketEndpointCaptor = new SignalCaptor(assert);

            argument.webSocketEndpoint.onMessage = VnfTestUtils.newPrintCallback(argument.webSocketEndpointCaptor,
                                                                                 "ws-endpoint");
            argument.webSocketEndpoint
                   .onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(argument.webSocketEndpointCaptor,
                                                                                 "ws-endpoint"));

            var webSocketRpc = argument.webSocketEndpoint.getWebSocketRpc();

            webSocketRpc.setBusyTimerInterval(200);
            webSocketRpc.setIdleTimerInterval(300);
            webSocketRpc.setLoginRecreateInterval(200)

            return callback(assert, argument);
        });
   }

    return {webSocketHubTest: webSocketHubTest};
})