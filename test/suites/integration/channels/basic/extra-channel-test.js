import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";
import {Random} from "../../../../../src/utils/random.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";
import {ChannelTestUtils} from "../../../../../test/utils/channel-test-utils.js";

QUnit.module("Channel Extra Tests");
ChannelTestUtils.integrationTest("Channel Send Object Test", function(assert, args) {
    var done = assert.async(1);

    var MarshallerHub = new Vnf.MarshallerHub(args.vnfHub);

    args.endpointRecipient = MarshallerHub.openEndpoint(args.recipientEva);
    args.endpointSender = MarshallerHub.openEndpoint(args.senderEva);

    args.endpointRecipient.onMessage = function(event) {
        Log.verbose(event.endpoint.eva, "message-test-handler", JSON.stringify(event));

        assert.equal(event.message.value1,       "object-value-1", "Verifying message value1");
        assert.equal(event.message.sub.value2,   "object-sub-value-2", "Verifying message value2");

        args.endpointRecipient.destroy();
        args.endpointSender.destroy();

        done();
    };

    args.endpointSender.openConnection(args.recipientEva, function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");
        args.endpointSender.send(args.recipientEva, {value1: "object-value-1", sub:{value2: "object-sub-value-2"}});
    });
});


ChannelTestUtils.integrationTest("Channel Loopback Test", function(assert, args) {

    var done = assert.async(1);

    args.endpointSender.openConnection(args.senderEva, function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");
        assert.equal(event.targetEva, args.senderEva, "Verifying targetEva");
        assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
        assert.equal(event.endpoint.eva, args.senderEva, "Verifying endpoint eva");

        args.endpointSender.send(args.senderEva, "message-sender-to-self");
    });

    Promise.resolve()
    .then(args.senderCaptor.assertSignals.bind(null, [`from ${args.senderEva}: message-sender-to-self`]))

    .then(args.endpointRecipient.destroy)
    .then(args.endpointSender.destroy)

    .then(done);
});


ChannelTestUtils.integrationTest("Multiple/Loopback Channels Send Test", function(assert, args) {

    var done = assert.async(1);

    var vnfHub = args.hubFactory();

    var eva1 = Random.random6() + "-eva-1";
    var eva2 = Random.random6() + "-eva-2";
    var eva3 = Random.random6() + "-eva-3";

    var endpoint1 = vnfHub.openEndpoint(eva1);
    var endpoint2 = vnfHub.openEndpoint(eva2);
    var endpoint3 = vnfHub.openEndpoint(eva3);

    var capture1 = new SignalCaptor(assert);
    var capture2 = new SignalCaptor(assert);
    var capture3 = new SignalCaptor(assert);

    var doneCaptor = new SignalCaptor(assert);

    endpoint1.onMessage = VnfTestUtils.newPrintCallback(capture1, eva1);
    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, eva2);
    endpoint3.onMessage = VnfTestUtils.newPrintCallback(capture3, eva3);

    function sendMessage(endpoint, targetEva, message) {
        endpoint.openConnection(targetEva, function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");
            endpoint.send(targetEva, message);
        })
    }

    sendMessage(endpoint1, eva2, "message-from-eva1-to-eva2");
    sendMessage(endpoint1, eva3, "message-from-eva1-to-eva3");

    sendMessage(endpoint2, eva1, "message-from-eva2-to-eva1");
    endpoint2.openConnection(eva3, function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");
        endpoint2.send(eva3, "1st-message-from-eva2-to-eva3");
        endpoint2.send(eva3, "2nd-message-from-eva2-to-eva3");
    })

    sendMessage(endpoint3, eva1, "message-from-eva3-to-eva1");
    sendMessage(endpoint3, eva2, "message-from-eva3-to-eva2");
    sendMessage(endpoint3, eva3, "message-from-eva3-to-eva3");

    capture1.assertSignalsUnordered([`from ${eva2}: message-from-eva2-to-eva1`,
                                 `from ${eva3}: message-from-eva3-to-eva1`])
             .then(doneCaptor.signal.bind(null, "done-1"));

    capture2.assertSignalsUnordered([`from ${eva1}: message-from-eva1-to-eva2`,
                                 `from ${eva3}: message-from-eva3-to-eva2`])
            .then(doneCaptor.signal.bind(null, "done-2"));

    capture3.assertSignalsUnordered([`from ${eva1}: message-from-eva1-to-eva3`,
                                 `from ${eva2}: 1st-message-from-eva2-to-eva3`,
                                 `from ${eva2}: 2nd-message-from-eva2-to-eva3`,
                                 `from ${eva3}: message-from-eva3-to-eva3`])
            .then(doneCaptor.signal.bind(null, "done-3"));

    doneCaptor.assertSignalsUnordered(["done-1", "done-2", "done-3"])

    .then(args.endpointRecipient.destroy)
    .then(args.endpointSender.destroy)

    .then(endpoint1.destroy)
    .then(endpoint2.destroy)
    .then(endpoint3.destroy)
    .then(done);
});

ChannelTestUtils.integrationTest("Channel Big Message Test", function(assert, args) {
    var done = assert.async(1);


    if(["Reliable Rtc WebSocket", "WebSocket", "Rtc"].indexOf(args.channelName) != -1) {
        assert.ok(true, "Skipping RTC do not supports Big Message");
        done()
        return;
    }

    var bigMessage = [
        new Array(64*1024).join('A'),
        new Array(64*1024).join('AB'),
        new Array(64*1024).join('Hello World!'),
        new Array(10*64*1024 - 1).join('A'),
        "Hello World!" + new Array(64*1024).join('A') + "Hello World!"
    ];

    var index = 0;
    args.endpointRecipient.onMessage = function(event) {
        Log.verbose(args.recipientEva, "message-test-handler", event.message.substr(0, 100) + "\n.......");
        assert.deepEqual(event.message, bigMessage[index++],  "Asserting captured logs");

        if(index == bigMessage.length) {

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        }
    };

    args.endpointSender.openConnection(args.recipientEva, function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        for(var i = 0; i < bigMessage.length; i++) {
            args.endpointSender.send(args.recipientEva, bigMessage[i]);
        }
    });
});
