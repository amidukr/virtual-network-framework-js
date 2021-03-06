import {MockWebSocketFactory} from "./mock/mock-websocket-factory.js";
import {VnfTestUtils} from "./vnf-test-utils.js";

import {Vnf} from "../../src/vnf/vnf.js";

export class WebSocketRpcTestUtils {
    static setupWebSocketRpcMocks(assert, argument) {
        argument.mockWebSocketFactory = new MockWebSocketFactory(assert);
        argument.webSocketRpc = new Vnf.WebSocketRpc("ws-endpoint", argument.mockWebSocketFactory);
        argument.webSocketCaptor = argument.mockWebSocketFactory.captor;

        argument.webSocketRpc.setBusyTimerInterval(200);
        argument.webSocketRpc.setIdleTimerInterval(300);
        argument.webSocketRpc.setLoginRecreateInterval(200)

        VnfTestUtils.onTearDown(function(){
            argument.webSocketRpc.destroy();
        });
    }

    static doLogin(argument, index) {
        return Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["new-websocket"]))
        .then(argument.mockWebSocketFactory.fireOnopen.bind(null))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: " + index + " LOGIN\nws-endpoint"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, index + " LOGIN\nOK"))
    }
}

WebSocketRpcTestUtils.MockWebSocketFactory = MockWebSocketFactory;
