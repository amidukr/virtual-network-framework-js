import {Log}         from "../../src/utils/logger.js";
import {SignalCaptor} from "../../src/utils/signal-captor.js";

import {VnfTestUtils} from "./vnf-test-utils.js";

import {Vnf} from "../../src/vnf/vnf.js";

export class ReliableTestUtils {
    static reliableVnfTest(description, callback) {
        function prepareArguments(assert, args) {
            var rootHub  = new Vnf.InBrowserHub();
            var reliableHub = new Vnf.ReliableHub(rootHub);

            var reliableCapture = new SignalCaptor(assert);
            var rootCapture     = new SignalCaptor(assert);

            rootHub.setImmediateSend(true);

            var reliableEndpoint = reliableHub.openEndpoint("reliable-endpoint");
            var rootEndpoint = rootHub.openEndpoint("root-endpoint");

            reliableEndpoint.onMessage = VnfTestUtils.newPrintCallback(reliableCapture, "reliable-endpoint");
            rootEndpoint.onMessage     = VnfTestUtils.newPrintCallback(rootCapture,      "root-endpoint");

            reliableEndpoint.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(reliableCapture, "reliable-endpoint"));
            rootEndpoint.onConnectionLost(VnfTestUtils.newConnectionLostPrintCallback(rootCapture, "root-endpoint"));

            reliableEndpoint.setEndpointId("rel1");
            reliableHub.setHeartbeatInterval(10000);


            function destroy() {
                reliableEndpoint.destroy();
                rootEndpoint.destroy();
            }

            function makeConnection() {

                args.reliableEndpoint.openConnection("root-endpoint", function(event){
                    assert.equal(event.status, "CONNECTED", "Reliable connected");

                    if(event.status != "CONNECTED") {
                        return;
                    }

                    args.reliableCapture.signal("openConnection captured");
                });

                return Promise.resolve()
                    .then(args.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
                    .then(args.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root1-1"))
                    .then(args.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))
                    .then(args.reliableCapture.assertSignals.bind(null, ['openConnection captured']))
            }

            return Object.assign({}, {  reliableHub:      reliableHub,
                                        reliableEndpoint: reliableEndpoint,
                                        reliableCapture:  reliableCapture,

                                        rootHub:      rootHub,
                                        rootEndpoint: rootEndpoint,
                                        rootCapture:  rootCapture,

                                        makeConnection: makeConnection,
                                        destroy: destroy},
                           args);
        }

        VnfTestUtils.test("Reliable Hub",  description, prepareArguments,  callback);
    }
}
