define(["vnf/vnf",
        "test/utils/vnf-test-utils",
        "utils/signal-captor"],
function(  Vnf,
           VnfTestUtils,
           SignalCaptor){

    function vfnSystemTest(description, callback) {


        //Vnf.System.registerWebSocket(vnfSystem, "http://....");
        //Vnf.System.registerInBrowser(vnfSystem, inBrowserHub, inBrowserStore);

        //argument.vnfEndpoint = .... //vnf-endpoint
        //argument.rootEndpoint = .... //root-endpoint

        function prepareArguments(assert, args) {
            var vnfSystem = new Vnf.System();

            var rootHub  = args.rootHubFactory();

            vnfSystem.registerService(new Vnf.System.ChannelHubService(rootHub))
            vnfSystem.registerService(new Vnf.System.StoreService(new Vnf.InBrowserStore()))

            var rootCapture = new SignalCaptor(assert);

            var rootEndpoint = rootHub.openEndpoint("root-endpoint");

            rootEndpoint.onMessage     = VnfTestUtils.newPrintCallback(rootCapture,      "root-endpoint");

            rootEndpoint.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(rootCapture, "root-endpoint"));

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

        VnfTestUtils.vnfTest("[Vnf System Tests]-" + description, prepareArguments, callback);
    }

    return {vfnSystemTest: vfnSystemTest};
})