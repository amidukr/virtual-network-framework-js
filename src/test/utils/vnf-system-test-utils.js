import {SignalCaptor} from "../../utils/signal-captor.js";

import {VnfTestUtils} from "./vnf-test-utils.js";

import {Vnf} from "../../vnf/vnf.js";

export class VnfSystemTestUtils {
    static vfnSystemTest(description, callback) {


        //Vnf.System.registerWebSocket(vnfSystem, "http://....");
        //Vnf.System.registerInBrowser(vnfSystem, inBrowserHub, inBrowserStore);

        //argument.vnfEndpoint = .... //vnf-endpoint
        //argument.rootEndpoint = .... //root-endpoint

        function prepareArguments(assert, args) {
            var vnfSystem = new Vnf.System();

            var rootHub  = new Vnf.BigMessageHub(new Vnf.InBrowserHub());

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

        VnfTestUtils.test("Vnf System Tests", description, prepareArguments, callback);
    }
}