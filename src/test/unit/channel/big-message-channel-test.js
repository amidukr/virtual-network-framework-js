import {SignalCaptor} from "../../../utils/signal-captor.js";

import {VnfTestUtils} from "../../utils/vnf-test-utils.js";

import {Vnf} from "../../../vnf/vnf.js";

function bigMessageTest(description, callback) {
    function prepareArguments(assert, args) {
        args.rootHub = new Vnf.InBrowserHub();
        args.bigMessageHub = new Vnf.BigMessageHub(args.rootHub, {fragmentSize: 5});

        args.rootEndpoint = args.rootHub.openEndpoint("root-endpoint");
        args.bigMessageEndpoint = args.bigMessageHub.openEndpoint("big-message-endpoint");


        args.rootEndpointCaptor = new SignalCaptor(assert);
        args.bigMessageCaptor = new SignalCaptor(assert);

        args.rootEndpoint.onMessage = VnfTestUtils.newPrintCallback(args.rootEndpointCaptor, "root-endpoint");
        args.bigMessageEndpoint.onMessage  = VnfTestUtils.newPrintCallback(args.bigMessageCaptor, "big-message-endpoint");
    }

    VnfTestUtils.test("Big Message Hub",  description, prepareArguments, callback);
}

QUnit.module("BigMessage Channel Test");
bigMessageTest("Serialize message test", function(assert, argument){
    var done = assert.async(1);

    argument.bigMessageEndpoint.openConnection("root-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.bigMessageEndpoint.send("root-endpoint", "abcdefghijk");
        argument.bigMessageEndpoint.send("root-endpoint", "lmnopqrstu");
        argument.bigMessageEndpoint.send("root-endpoint", "vwxyz");
    })

    Promise.resolve()
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: S211abcde']))
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: fghij']))
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: k']))
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: S210lmnop']))
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: qrstu']))
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: S15vwxyz']))

    .then(argument.rootEndpoint.destroy)
    .then(argument.bigMessageEndpoint.destroy)

    .then(done);

});

bigMessageTest("Deserialize message test", function(assert, argument){
    var done = assert.async(1);

    argument.rootEndpoint.openConnection("big-message-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.rootEndpoint.send("big-message-endpoint", "S13ab");
        argument.rootEndpoint.send("big-message-endpoint", "c");
        argument.rootEndpoint.send("big-message-endpoint", "S213defgh");
        argument.rootEndpoint.send("big-message-endpoint", "ijklmn");
        argument.rootEndpoint.send("big-message-endpoint", "op");
    });

    Promise.resolve()
    .then(argument.bigMessageCaptor.assertSignals.bind(null, ['from root-endpoint: abc']))
    .then(argument.bigMessageCaptor.assertSignals.bind(null, ['from root-endpoint: defghijklmnop']))

    .then(argument.rootEndpoint.destroy)
    .then(argument.bigMessageEndpoint.destroy)

    .then(done);
});

bigMessageTest("Send object message test", function(assert, argument){
    var done = assert.async(1);

    argument.bigMessageEndpoint.openConnection("root-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.bigMessageEndpoint.send("root-endpoint", {json:'value'});
    })

    Promise.resolve()
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: J216{"jso']))
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: n":"v']))
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: alue"']))
    .then(argument.rootEndpointCaptor.assertSignals.bind(null, ['from big-message-endpoint: }']))

    .then(argument.rootEndpoint.destroy)
    .then(argument.bigMessageEndpoint.destroy)

    .then(done);
});

bigMessageTest("Receive object message test", function(assert, argument){
    var done = assert.async(1);

    argument.rootEndpoint.openConnection("big-message-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        argument.rootEndpoint.send("big-message-endpoint", 'J216{"jso');
        argument.rootEndpoint.send("big-message-endpoint", 'n":"v');
        argument.rootEndpoint.send("big-message-endpoint", 'alue"');
        argument.rootEndpoint.send("big-message-endpoint", '}');
    });

    Promise.resolve()
    .then(argument.bigMessageCaptor.assertSignals.bind(null, ['from root-endpoint: {"json":"value"}']))

    .then(argument.rootEndpoint.destroy)
    .then(argument.bigMessageEndpoint.destroy)

    .then(done);
});

bigMessageTest("End-to-end-test", function(assert, argument){
    var done = assert.async(1);

    var endpointBigSender = argument.bigMessageHub.openEndpoint("big-sender");

    endpointBigSender.openConnection("big-message-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        endpointBigSender.send("big-message-endpoint", "a1b2c3d4e5f6g7h8j9k0l1m2n3")
        endpointBigSender.send("big-message-endpoint", "o4p5q6r7s8");
    });

    Promise.resolve()
    .then(argument.bigMessageCaptor.assertSignals.bind(null, ['from big-sender: a1b2c3d4e5f6g7h8j9k0l1m2n3']))
    .then(argument.bigMessageCaptor.assertSignals.bind(null, ['from big-sender: o4p5q6r7s8']))

    .then(endpointBigSender.destroy)
    .then(argument.rootEndpoint.destroy)
    .then(argument.bigMessageEndpoint.destroy)

    .then(done);
});

bigMessageTest("Object End-to-end-test", function(assert, argument){
    var done = assert.async(1);

    var endpointBigSender = argument.bigMessageHub.openEndpoint("big-sender");

    endpointBigSender.openConnection("big-message-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        endpointBigSender.send("big-message-endpoint", {json:"value"})
    });

    Promise.resolve()
    .then(argument.bigMessageCaptor.assertSignals.bind(null, ['from big-sender: {"json":"value"}']))

    .then(endpointBigSender.destroy)
    .then(argument.rootEndpoint.destroy)
    .then(argument.bigMessageEndpoint.destroy)

    .then(done);
});
