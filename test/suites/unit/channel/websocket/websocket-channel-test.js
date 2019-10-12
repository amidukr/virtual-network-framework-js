import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log}          from "../../../../../src/utils/logger.js";

import {VnfTestUtils}              from "../../../../utils/vnf-test-utils.js";
import {WebSocketRpcTestUtils}     from "../../../../utils/websocket-rpc-test-utils.js";
import {WebSocketChannelTestUtils} from "../../../../utils/websocket-channel-test-utils.js";

import {Vnf} from "../../../../../src/vnf/vnf.js";

QUnit.module("WebSocketHub Basic Tests");
WebSocketChannelTestUtils.webSocketHubTest("New connection join test", function(assert, argument){
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

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});

WebSocketChannelTestUtils.webSocketHubTest("New connection join - retry test", function(assert, argument){
    var done = assert.async(1);

    argument.webSocketHub.setResendHandshakeInterval(300);

    argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.webSocketEndpointCaptor.signal("ws-endpoint connectionOpened");
    });

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 SEND_TO_ENDPOINT"))

    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nACCEPT"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint connectionOpened"]))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});

WebSocketChannelTestUtils.webSocketHubTest("New connection join - failed due to timeout test", function(assert, argument){
    var done = assert.async(1);

    argument.webSocketHub.setResendHandshakeInterval(300);

    argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
        assert.equal(event.status, "FAILED", "Verifying status");

        argument.webSocketEndpointCaptor.signal("ws-endpoint openConnection failed");
    });

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT\nSEND_TO_ENDPOINT_RECIPIENT_ENDPOINT_CANNOT_BE_FOUND"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 SEND_TO_ENDPOINT"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint openConnection failed"]))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});

WebSocketChannelTestUtils.webSocketHubTest("New connection accept test", function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 0))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nHANDSHAKE"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 SEND_TO_ENDPOINT\nremote-endpoint\nACCEPT"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 SEND_TO_ENDPOINT"))

    .then(function(){
        argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            argument.webSocketEndpoint.destroy();
            done();
        });
    });
});

WebSocketChannelTestUtils.webSocketHubTest("Send message test", function(assert, argument){
    var done = assert.async(1);

    argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.webSocketEndpoint.send("remote-endpoint", "my test\nmessage")
    });

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 SEND_TO_ENDPOINT"))

    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nACCEPT"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 SEND_TO_ENDPOINT\nremote-endpoint\nMESSAGE\nmy test\nmessage"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 SEND_TO_ENDPOINT"))

    .then(argument.webSocketEndpoint.destroy)

    .then(done);
});

WebSocketChannelTestUtils.webSocketHubTest("onMessage test", function(assert, argument){
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
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nMESSAGE\nmy\ntest message"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint connectionOpened"]))
    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ['from remote-endpoint: my\ntest message']))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});


WebSocketChannelTestUtils.webSocketHubTest("Fail-over malformed message test", function(assert, argument){
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

    // sending malformed message
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpointMESSAGESmalformed-message"))

    // sending regular message
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nMESSAGE\nendpoint-message"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["ws-endpoint connectionOpened"]))
    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ['from remote-endpoint: endpoint-message']))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});

WebSocketChannelTestUtils.webSocketHubTest("closeConnection notification test", function(assert, argument){
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

    .then(argument.webSocketEndpoint.closeConnection.bind(null, "remote-endpoint"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 SEND_TO_ENDPOINT\nremote-endpoint\nCLOSE-CONNECTION"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 SEND_TO_ENDPOINT"))

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["from remote-endpoint connection lost"]))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});



WebSocketChannelTestUtils.webSocketHubTest("handling closeConnection message test", function(assert, argument){
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

    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nCLOSE-CONNECTION"))
    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["from remote-endpoint connection lost"]))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});

WebSocketChannelTestUtils.webSocketHubTest("closeConnection after send failed test", function(assert, argument){
    var done = assert.async(1);

    argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.webSocketEndpoint.send("remote-endpoint", "my test\nmessage")
    });

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nACCEPT"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 SEND_TO_ENDPOINT\nremote-endpoint\nMESSAGE\nmy test\nmessage"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 SEND_TO_ENDPOINT\nSEND_TO_ENDPOINT_RECIPIENT_ENDPOINT_CANNOT_BE_FOUND"))


    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 SEND_TO_ENDPOINT\nremote-endpoint\nCLOSE-CONNECTION"]))
    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["from remote-endpoint connection lost"]))

    .then(argument.webSocketEndpoint.destroy)

    .then(done)
});

WebSocketChannelTestUtils.webSocketHubTest("Endpoint destroy test", function(assert, argument){
    var done = assert.async(1);

    argument.webSocketEndpoint.openConnection("remote-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");
    });

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 SEND_TO_ENDPOINT\nremote-endpoint\nHANDSHAKE"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "ENDPOINT_MESSAGE\nremote-endpoint\nACCEPT"))

    .then(argument.webSocketEndpoint.destroy)

    .then(argument.webSocketEndpointCaptor.assertSignals.bind(null, ["from remote-endpoint connection lost"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 SEND_TO_ENDPOINT\nremote-endpoint\nCLOSE-CONNECTION"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["close"]))

    .then(done)
});
