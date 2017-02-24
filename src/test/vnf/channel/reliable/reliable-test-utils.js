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

            reliableEndpoint.setEndpointId("rel1");
            reliableEndpoint.setHeartbeatInterval(10000);

            var reliableCapture = Log.captureLogs(assert, ["reliable-endpoint"], ["message-test-handler"]);
            var rootCapture     = Log.captureLogs(assert, ["root-endpoint"],     ["message-test-handler"]);

            function destroy() {
                reliableEndpoint.destroy();
                rootEndpoint.destroy();
            }

            return {reliableHub:      reliableHub,
                    reliableEndpoint: reliableEndpoint,
                    reliableCapture:  reliableCapture,

                    rootHub:      rootHub,
                    rootEndpoint: rootEndpoint,
                    rootCapture:  rootCapture,

                    destroy: destroy};
        }

        VNFTestUtils.vnfTest("[Reliable Hub v0.2] " + description, prepareArguments, callback);
    };

    return {reliableVNFTest: reliableVNFTest};
})