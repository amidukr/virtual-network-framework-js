define(["vnf/vnf",
           "utils/capture-logs",
           "test/vnf-test-utils"],
function(  VNF,
           Log,
           VNFTestUtils){

    function reliableVNFTest(description, callback) {
        function prepareArguments(assert, args) {
            var rootHub  = args.rootHubFactory();
            var reliableHub = new VNF.ReliableHub(rootHub);

            var reliableEndpoint = reliableHub.openEndpoint("reliable-endpoint");
            var rootEndpoint = rootHub.openEndpoint("root-endpoint");

            reliableEndpoint.onMessage = VNFTestUtils.newPrintCallback("reliable-endpoint");
            rootEndpoint.onMessage     = VNFTestUtils.newPrintCallback("root-endpoint");

            reliableEndpoint.onConnectionLost(VNFTestUtils.newConnectionLostPrintCallback("reliable-endpoint"));
            rootEndpoint.onConnectionLost(VNFTestUtils.newConnectionLostPrintCallback("root-endpoint"));

            reliableEndpoint.setEndpointId("rel1");
            reliableHub.setHeartbeatInterval(10000);
            reliableHub.setHandshakeRetries(0);

            var reliableCapture = Log.captureLogs(assert, ["reliable-endpoint"], ["message-test-handler", "connection-lost-handler"]);
            var rootCapture     = Log.captureLogs(assert, ["root-endpoint"],     ["message-test-handler", "connection-lost-handler"]);

            function destroy() {
                reliableEndpoint.destroy();
                rootEndpoint.destroy();
            }

            function makeConnection() {
                reliableEndpoint.send('root-endpoint', "utils-message-1");

                return Promise.resolve()

                .then(rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":0,"messageIndex":0,"payload":"utils-message-2"}))

                .then(rootCapture.assertLog.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"utils-message-1"}']))
                .then(reliableCapture.assertLog.bind(null, ['from root-endpoint: utils-message-2']))
            }

            function fastHeartbeats() {
                reliableHub.setHeartbeatInterval(args.getInterval("reliableFastHeartbeatInterval"));
                reliableHub.setConnectionInvalidateInterval(args.getInterval("reliableFastConnectionInvalidateInterval"));
                reliableHub.setConnectionLostTimeout(args.getInterval("reliableFastConnectionLostTimeout"));
                reliableHub.setHandshakeRetryInterval(args.getInterval("reliableFastHandshakeRetryInterval"));
                reliableHub.setKeepAliveHandshakingChannelTimeout(args.getInterval("reliableFastKeepAliveHandshakingChannelTimeout"));
            }

            return Object.assign({}, {  reliableHub:      reliableHub,
                                        reliableEndpoint: reliableEndpoint,
                                        reliableCapture:  reliableCapture,

                                        rootHub:      rootHub,
                                        rootEndpoint: rootEndpoint,
                                        rootCapture:  rootCapture,

                                        makeConnection: makeConnection,
                                        fastHeartbeats: fastHeartbeats,
                                        destroy: destroy},
                           args);
        }

        VNFTestUtils.vnfTest("[Reliable Hub v0.2] " + description, prepareArguments, callback);
    };

    return {reliableVNFTest: reliableVNFTest};
})