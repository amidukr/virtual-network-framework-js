define(["vnf/vnf",
        "test/utils/vnf-test-utils",
        "utils/signal-captor"],
function(  VNF,
           VNFTestUtils,
           SignalCaptor){

    function vfnSystemTest(description, callback) {


        //VNF.System.registerWebSocket(vnfSystem, "http://....");
        //VNF.System.registerInBrowser(vnfSystem, inBrowserHub, inBrowserStore);

        //argument.vnfEndpoint = .... //vnf-endpoint
        //argument.rootEndpoint = .... //root-endpoint

        function prepareArguments(assert, args) {
            var vnfSystem = new VNF.System();

            var rootHub  = args.rootHubFactory();

            vnfSystem.registerService(new VNF.System.ChannelHubService(rootHub))
            vnfSystem.registerService(new VNF.System.StoreService(new VNF.InBrowserStore()))

            var rootCapture = new SignalCaptor(assert);

            var rootEndpoint = rootHub.openEndpoint("root-endpoint");

            rootEndpoint.onMessage     = VNFTestUtils.newPrintCallback(rootCapture,      "root-endpoint");

            rootEndpoint.onConnectionLost(VNFTestUtils.newConnectionLostPrintCallback(rootCapture, "root-endpoint"));

            function destroy() {
                rootEndpoint.destroy();
            }

            return Object.assign({}, {  vnfSystem: vnfSystem,

                                        rootHub:      rootHub,
                                        rootEndpoint: rootEndpoint,
                                        rootCapture:  rootCapture,

                                        destroy: destroy},
                           args);
        }

        VNFTestUtils.vnfTest("[VNF System Tests]-" + description, prepareArguments, callback);
    }

    return {vfnSystemTest: vfnSystemTest};
})