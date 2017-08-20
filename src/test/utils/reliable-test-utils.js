define(["vnf/vnf",
           "utils/signal-captor",
           "test/utils/vnf-test-utils",
           "utils/signal-captor"],
function(  Vnf,
           Log,
           VnfTestUtils,
           SignalCaptor){

    function reliableVnfTest(description, callback) {
        function prepareArguments(assert, args) {
            var rootHub  = new Vnf.InBrowserHub();
            var reliableHub = new Vnf.ReliableHub(rootHub);

            var reliableCapture = new SignalCaptor(assert);
            var rootCapture     = new SignalCaptor(assert);

            var reliableEndpoint = reliableHub.openEndpoint("reliable-endpoint");
            var rootEndpoint = rootHub.openEndpoint("root-endpoint");

            reliableEndpoint.onMessage = VnfTestUtils.newPrintCallback(reliableCapture, "reliable-endpoint");
            rootEndpoint.onMessage     = VnfTestUtils.newPrintCallback(rootCapture,      "root-endpoint");

            reliableEndpoint.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(reliableCapture, "reliable-endpoint"));
            rootEndpoint.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(rootCapture, "root-endpoint"));

            reliableEndpoint.setEndpointId("rel1");
            reliableHub.setHeartbeatInterval(10000);
            reliableHub.setHandshakeRetries(0);


            function destroy() {
                reliableEndpoint.destroy();
                rootEndpoint.destroy();
            }

            function makeConnection() {
                reliableEndpoint.send('root-endpoint', "utils-message-1");

                return Promise.resolve()

                .then(rootCapture.assertSignals.bind(null, ['from reliable-endpoint: {"type":"HANDSHAKE","sessionId":"rel1-1","messageIndex":0,"payload":"utils-message-1"}']))

                .then(rootEndpoint.send.bind(null, "reliable-endpoint", {"type":"ACCEPT","sessionId":"root1-1","toSID":"rel1-1","mqStartFrom":0,"messageIndex":0,"payload":"utils-message-2"}))

                .then(reliableCapture.assertSignals.bind(null, ['from root-endpoint: utils-message-2']))
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

        VnfTestUtils.test("Reliable Hub",  description, prepareArguments,  callback);
    };

    return {reliableVnfTest: reliableVnfTest};
})