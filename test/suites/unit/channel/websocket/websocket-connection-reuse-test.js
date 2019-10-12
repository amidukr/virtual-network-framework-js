import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log}          from "../../../../../src/utils/logger.js";

import {VnfTestUtils}              from "../../../../utils/vnf-test-utils.js";
import {WebSocketRpcTestUtils}     from "../../../../utils/websocket-rpc-test-utils.js";
import {WebSocketChannelTestUtils} from "../../../../utils/websocket-channel-test-utils.js";

import {Vnf} from "../../../../../src/vnf/vnf.js";

QUnit.module("WebSocketHub Connection Reuse Tests");
WebSocketChannelTestUtils.webSocketHubTest("HANDSHAKE after CLOSE-CONNECTION", function(assert, argument){
    var done = assert.async(1);

    argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.webSocketEndpointCaptor.signal("ws-endpoint connectionOpened");
    });

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT"))

    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nACCEPT"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint connectionOpened"]))

    .then(function(){
        argument.mockWebSocketFactory.fireOnmessage("ENDPOINT_MESSAGE\nremote-endpoint\nCLOSE-CONNECTION");
        argument.mockWebSocketFactory.fireOnmessage("ENDPOINT_MESSAGE\nremote-endpoint\nHANDSHAKE");
    })

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 SEND_TO_ENDPOINT\nremote-endpoint\nACCEPT"]))
    .then(function(){
        argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying second open-connection status");

            argument.webSocketEndpointCaptor.signal("ws-endpoint connectionOpened-2");
        });
    })

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["from remote-endpoint connection lost"]))
    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint connectionOpened-2"]))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});

WebSocketChannelTestUtils.webSocketHubTest("openConnection call just after closeConnection call", function(assert, argument){
    var done = assert.async(1);

    argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.webSocketEndpointCaptor.signal("ws-endpoint connectionOpened");
    });

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT"))

    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nACCEPT"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint connectionOpened"]))

    .then(function(){
        argument.webSocketEndpoint.closeConnection("remote-endpoint");
        argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying second open-connection status");

            argument.webSocketEndpointCaptor.signal("ws-endpoint connectionOpened-2");
        });
    })

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["from remote-endpoint connection lost"]))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 SEND_TO_ENDPOINT\nremote-endpoint\nCLOSE-CONNECTION"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 SEND_TO_ENDPOINT"))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 SEND_TO_ENDPOINT"))

    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nACCEPT"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint connectionOpened-2"]))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});

WebSocketChannelTestUtils.webSocketHubTest("openConnection call just after CLOSE-CONNECTION event", function(assert, argument){
    var done = assert.async(1);

    argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.webSocketEndpointCaptor.signal("ws-endpoint connectionOpened");
    });

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT"))

    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nACCEPT"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint connectionOpened"]))

    .then(function(){

        argument.webSocketEndpoint.onConnectionLost(function(targetVip){
            assert.equal(targetVip, "remote-endpoint", "Verifying connection-lost targetVip argument");

            argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying second open-connection status");

                argument.webSocketEndpointCaptor.signal("ws-endpoint connectionOpened-2");
            });
        });

        argument.mockWebSocketFactory.fireOnmessage("ENDPOINT_MESSAGE\nremote-endpoint\nCLOSE-CONNECTION");
    })

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["from remote-endpoint connection lost"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 SEND_TO_ENDPOINT"))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nACCEPT"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint connectionOpened-2"]))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});
