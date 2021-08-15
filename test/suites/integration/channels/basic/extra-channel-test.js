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

    args.endpointRecipient = MarshallerHub.openEndpoint(args.recipientVip);
    args.endpointSender = MarshallerHub.openEndpoint(args.senderVip);

    args.endpointRecipient.onMessage = function(event) {
        Log.verbose(event.endpoint.vip, "message-test-handler", JSON.stringify(event));

        assert.equal(event.message.value1,       "object-value-1", "Verifying message value1");
        assert.equal(event.message.sub.value2,   "object-sub-value-2", "Verifying message value2");

        args.endpointRecipient.destroy();
        args.endpointSender.destroy();

        done();
    };

    args.endpointSender.openConnection(args.recipientVip, function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");
        args.endpointSender.send(args.recipientVip, {value1: "object-value-1", sub:{value2: "object-sub-value-2"}});
    });
});


ChannelTestUtils.integrationTest("Channel Loopback Test", function(assert, args) {

    var done = assert.async(1);

    args.endpointSender.openConnection(args.senderVip, function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");
        assert.equal(event.targetVip, args.senderVip, "Verifying targetVip");
        assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
        assert.equal(event.endpoint.vip, args.senderVip, "Verifying endpoint vip");

        args.endpointSender.send(args.senderVip, "message-sender-to-self");
    });

    Promise.resolve()
    .then(args.senderCaptor.assertSignals.bind(null, [`from ${args.senderVip}: message-sender-to-self`]))

    .then(args.endpointRecipient.destroy)
    .then(args.endpointSender.destroy)

    .then(done);
});


ChannelTestUtils.integrationTest("Multiple/Loopback Channels Send Test", function(assert, args) {

    var done = assert.async(1);

    var vnfHub = args.hubFactory();

    var vip1 = Random.random6() + "-vip-1";
    var vip2 = Random.random6() + "-vip-2";
    var vip3 = Random.random6() + "-vip-3";

    var endpoint1 = vnfHub.openEndpoint(vip1);
    var endpoint2 = vnfHub.openEndpoint(vip2);
    var endpoint3 = vnfHub.openEndpoint(vip3);

    var capture1 = new SignalCaptor(assert);
    var capture2 = new SignalCaptor(assert);
    var capture3 = new SignalCaptor(assert);

    var doneCaptor = new SignalCaptor(assert);

    endpoint1.onMessage = VnfTestUtils.newPrintCallback(capture1, vip1);
    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, vip2);
    endpoint3.onMessage = VnfTestUtils.newPrintCallback(capture3, vip3);

    function sendMessage(endpoint, targetVip, message) {
        endpoint.openConnection(targetVip, function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");
            endpoint.send(targetVip, message);
        })
    }

    sendMessage(endpoint1, vip2, "message-from-vip1-to-vip2");
    sendMessage(endpoint1, vip3, "message-from-vip1-to-vip3");

    sendMessage(endpoint2, vip1, "message-from-vip2-to-vip1");
    endpoint2.openConnection(vip3, function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");
        endpoint2.send(vip3, "1st-message-from-vip2-to-vip3");
        endpoint2.send(vip3, "2nd-message-from-vip2-to-vip3");
    })

    sendMessage(endpoint3, vip1, "message-from-vip3-to-vip1");
    sendMessage(endpoint3, vip2, "message-from-vip3-to-vip2");
    sendMessage(endpoint3, vip3, "message-from-vip3-to-vip3");

    capture1.assertSignalsUnordered([`from ${vip2}: message-from-vip2-to-vip1`,
                                 `from ${vip3}: message-from-vip3-to-vip1`])
             .then(doneCaptor.signal.bind(null, "done-1"));

    capture2.assertSignalsUnordered([`from ${vip1}: message-from-vip1-to-vip2`,
                                 `from ${vip3}: message-from-vip3-to-vip2`])
            .then(doneCaptor.signal.bind(null, "done-2"));

    capture3.assertSignalsUnordered([`from ${vip1}: message-from-vip1-to-vip3`,
                                 `from ${vip2}: 1st-message-from-vip2-to-vip3`,
                                 `from ${vip2}: 2nd-message-from-vip2-to-vip3`,
                                 `from ${vip3}: message-from-vip3-to-vip3`])
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
        Log.verbose(args.recipientVip, "message-test-handler", event.message.substr(0, 100) + "\n.......");
        assert.deepEqual(event.message, bigMessage[index++],  "Asserting captured logs");

        if(index == bigMessage.length) {

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        }
    };

    args.endpointSender.openConnection(args.recipientVip, function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");

        for(var i = 0; i < bigMessage.length; i++) {
            args.endpointSender.send(args.recipientVip, bigMessage[i]);
        }
    });
});
