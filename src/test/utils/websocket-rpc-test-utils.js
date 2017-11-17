define(["vnf/vnf", "test/mock/mock-websocket-factory"], function(Vnf, MockWebSocketFactory){

    function setupWebSocketRpcMocks(assert, argument) {
        argument.mockWebSocketFactory = new MockWebSocketFactory(assert);
        argument.webSocketRpc = new Vnf.WebSocketRpc("ws-endpoint", argument.mockWebSocketFactory);
        argument.webSocketCaptor = argument.mockWebSocketFactory.captor;

        argument.webSocketRpc.setBusyTimerInterval(200);
        argument.webSocketRpc.setIdleTimerInterval(300);
        argument.webSocketRpc.setLoginRecreateInterval(200)
    }

    function doLogin(argument, index) {
        return Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: " + index + " LOGIN\nws-endpoint"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, index + " LOGIN\nOK"))
    }

    return {
        MockWebSocketFactory:   MockWebSocketFactory,
        doLogin:                doLogin,
        setupWebSocketRpcMocks: setupWebSocketRpcMocks
    }
})