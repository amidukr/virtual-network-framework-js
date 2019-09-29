import {ReliableTestUtils} from "../../../utils/reliable-test-utils.js";

QUnit.module("ReliableHub Message Order Correction");
ReliableTestUtils.reliableVnfTest("Order Correction: Test message Index order: 1 0 2", function(assert, argument) {
    var done = assert.async(1);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 1 message-2"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 0 message-1"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 2 message-3"))

    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-1']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-2']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))

    .then(argument.destroy)
    .then(done);
});

ReliableTestUtils.reliableVnfTest("Order Correction: Test send negative Index order: -1 0 1", function(assert, argument) {
    var done = assert.async(1);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 -1 message-0"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 0 message-1"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 1 message-2"))

    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-1']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-2']))

    .then(argument.destroy)
    .then(done);
});

ReliableTestUtils.reliableVnfTest("Order Correction: Test send negative Index and wrong order: -1 1 0", function(assert, argument) {
    var done = assert.async(1);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 -1 message-0"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 1 message-2"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 0 message-1"))

    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-1']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-2']))

    .then(argument.destroy)
    .then(done);
});

ReliableTestUtils.reliableVnfTest("Order Correction: Double message send: 0 1 1 2 3", function(assert, argument) {
    var done = assert.async(1);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 0 message-1"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 1 message-2"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 1 message-2-ignore"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 2 message-3"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 3 message-4"))

    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-1']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-2']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-4']))

    .then(argument.destroy)
    .then(done);
});

ReliableTestUtils.reliableVnfTest("Order Correction: Shuffled messages: 0 4 3 1 2", function(assert, argument) {
    var done = assert.async(1);

    Promise.resolve()

    .then(argument.makeConnection)

    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 0 message-1"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 4 message-5"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 3 message-4"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 1 message-2"))
    .then(argument.rootEndpoint.send.bind(null, 'reliable-endpoint', "MESSAGE rel1-1 2 message-3"))

    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-1']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-2']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-3']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-4']))
    .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message-5']))

    .then(argument.destroy)
    .then(done);
});
