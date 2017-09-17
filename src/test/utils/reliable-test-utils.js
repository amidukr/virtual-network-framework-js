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
                argument.reliableEndpoint.openConnection("root-endpoint", function(event){})

                return Promise.resolve()
                        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
                        .then(argument.rootCapture.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root1-1"))
                        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']));
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