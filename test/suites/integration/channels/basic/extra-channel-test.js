import {Vnf} from "../../../../../src/vnf/vnf.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";
import {Log} from "../../../../../src/utils/logger.js";

import {VnfTestUtils} from "../../../../../test/utils/vnf-test-utils.js";
import {ChannelTestUtils} from "../../../../../test/utils/channel-test-utils.js";

QUnit.module("Channel Extra Tests");
ChannelTestUtils.integrationTest("Channel Send Object Test", function(assert, args) {
    var done = assert.async(1);

    var bigMessageHub = new Vnf.BigMessageHub(args.vnfHub);

    args.endpointRecipient = bigMessageHub.openEndpoint("recipient");
    args.endpointSender = bigMessageHub.openEndpoint("sender");

    args.endpointRecipient.onMessage = function(event) {
        Log.info(event.endpoint.vip, "message-test-handler", JSON.stringify(event));

        assert.equal(event.message.value1,       "object-value-1", "Verifying message value1");
        assert.equal(event.message.sub.value2,   "object-sub-value-2", "Verifying message value2");

        args.endpointRecipient.destroy();
        args.endpointSender.destroy();

        done();
    };

    args.endpointSender.openConnection("recipient", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");
        args.endpointSender.send("recipient", {value1: "object-value-1", sub:{value2: "object-sub-value-2"}});
    });
});


ChannelTestUtils.integrationTest("Channel Loopback Test", function(assert, args) {

    var done = assert.async(1);

    args.endpointSender.openConnection("sender", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");
        assert.equal(event.targetVip, "sender", "Verifying targetVip");
        assert.equal(event.endpoint, args.endpointSender, "Verifying endpoint");
        assert.equal(event.endpoint.vip, "sender", "Verifying endpoint vip");

        args.endpointSender.send("sender", "message-sender-to-self");
    });

    Promise.resolve()
    .then(args.senderCaptor.assertSignals.bind(null, ["from sender: message-sender-to-self"]))

    .then(args.endpointRecipient.destroy)
    .then(args.endpointSender.destroy)

    .then(done);
});


ChannelTestUtils.integrationTest("Multiple/Loopback Channels Send Test", function(assert, args) {

    var done = assert.async(1);

    var vnfHub = args.hubFactory();

    var endpoint1 = vnfHub.openEndpoint("vip-1");
    var endpoint2 = vnfHub.openEndpoint("vip-2");
    var endpoint3 = vnfHub.openEndpoint("vip-3");

    var capture1 = new SignalCaptor(assert);
    var capture2 = new SignalCaptor(assert);
    var capture3 = new SignalCaptor(assert);

    var doneCaptor = new SignalCaptor(assert);

    endpoint1.onMessage = VnfTestUtils.newPrintCallback(capture1, "vip-1");
    endpoint2.onMessage = VnfTestUtils.newPrintCallback(capture2, "vip-2");
    endpoint3.onMessage = VnfTestUtils.newPrintCallback(capture3, "vip-3");

    function sendMessage(endpoint, targetVip, message) {
        endpoint.openConnection(targetVip, function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            endpoint.send(targetVip, message);
        })
    }

    sendMessage(endpoint1, "vip-2", "message-from-vip1-to-vip2");
    sendMessage(endpoint1, "vip-3", "message-from-vip1-to-vip3");

    sendMessage(endpoint2, "vip-1", "message-from-vip2-to-vip1");
    endpoint2.openConnection("vip-3", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");
        endpoint2.send("vip-3", "1st-message-from-vip2-to-vip3");
        endpoint2.send("vip-3", "2nd-message-from-vip2-to-vip3");
    })

    sendMessage(endpoint3, "vip-1", "message-from-vip3-to-vip1");
    sendMessage(endpoint3, "vip-2", "message-from-vip3-to-vip2");
    sendMessage(endpoint3, "vip-3", "message-from-vip3-to-vip3");

    capture1.assertSignalsUnordered(["from vip-2: message-from-vip2-to-vip1",
                                 "from vip-3: message-from-vip3-to-vip1"])

             .then(doneCaptor.signal.bind(null, "done-1"));

    capture2.assertSignalsUnordered(["from vip-1: message-from-vip1-to-vip2",
                                 "from vip-3: message-from-vip3-to-vip2"])

            .then(doneCaptor.signal.bind(null, "done-2"));

    capture3.assertSignalsUnordered(["from vip-1: message-from-vip1-to-vip3",
                                 "from vip-2: 1st-message-from-vip2-to-vip3",
                                 "from vip-2: 2nd-message-from-vip2-to-vip3",
                                 "from vip-3: message-from-vip3-to-vip3"])

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


    if(["WebSocket", "Rtc"].indexOf(args.channelName) != -1) {
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
        Log.info("recipient", "message-test-handler", event.message.substr(0, 100) + "\n.......");
        assert.deepEqual(event.message, bigMessage[index++],  "Asserting captured logs");

        if(index == bigMessage.length) {

            args.endpointRecipient.destroy();
            args.endpointSender.destroy();

            done();
        }
    };

    args.endpointSender.openConnection("recipient", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying status");

        for(var i = 0; i < bigMessage.length; i++) {
            args.endpointSender.send("recipient", bigMessage[i]);
        }
    });
});
