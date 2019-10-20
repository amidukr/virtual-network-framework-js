import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";
import {sleeper} from "../../../../../src/utils/promise-utils.js";
import {Random} from "../../../../../src/utils/random.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";

/*
   Test that verifies integration with VNF Server for sending data to destroyed endpoint
   VNF Server should return error in this case
*/
VnfTestUtils.test("WebSocketHub-Integration", "closeConnection after send failed integration test", function(assert){
    var done = assert.async(1);

    var manualRpcEndpointVip = Random.random6() + "-manual-rpc-endpoint";
    var wsEndpointVip = Random.random6() + "-ws-endpoint";

    var webSocketFactory = new Vnf.WebSocketFactory(TestingProfiles.vnfWebSocketUrl);
    var webSocketRpc = new Vnf.WebSocketRpc(manualRpcEndpointVip, webSocketFactory);

    var captor = new SignalCaptor(assert);

    webSocketRpc.registerPushHandler("ENDPOINT_MESSAGE", function(event){
        captor.signal("message: " + event.data);
    });

    var hub = new Vnf.WebSocketHub(webSocketFactory);
    var endpoint = hub.openEndpoint(wsEndpointVip);

    endpoint.openConnection(manualRpcEndpointVip, function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        endpoint.send(manualRpcEndpointVip, "my-test-message-1");
    });

    endpoint.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(captor, "reliable-endpoint"));

    Promise.resolve()
    .then(captor.assertSignals.bind(null, [`message: ${wsEndpointVip}\nHANDSHAKE`]))
    .then(webSocketRpc.invoke.bind(null, "SEND_TO_ENDPOINT", `${wsEndpointVip}\nACCEPT`, {retryResend: true}))
    .then(function(e) {
        assert.notOk(e.data);
    })

    .then(captor.assertSignals.bind(null, [`message: ${wsEndpointVip}\nMESSAGE\nmy-test-message-1`]))

    .then(endpoint.send.bind(null, manualRpcEndpointVip, "my-test-message-2"))
    .then(captor.assertSignals.bind(null, [`message: ${wsEndpointVip}\nMESSAGE\nmy-test-message-2`]))
    .then(webSocketRpc.destroy)
    .then(sleeper(100))
    .then(endpoint.send.bind(null, manualRpcEndpointVip, "my-test-message-3"))
    .then(captor.assertSignals.bind(null, [`from ${manualRpcEndpointVip} connection lost`]))

    .then(endpoint.destroy)
    .then(done);
});