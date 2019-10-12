import {ReliableTestUtils} from "../../../../utils/reliable-test-utils.js";

QUnit.module("ReliableHub Handshake Retry");
ReliableTestUtils.reliableVnfTest("ReliableHub Handshake Retry test", function(assert, argument) {
    var done = assert.async(1);

    argument.reliableHub.setHeartbeatInterval(5);
    argument.reliableHub.setConnectionInvalidateInterval(15);
    argument.reliableHub.setConnectionLostTimeout(60);

    var connectionFailedCaptured = false;

    argument.reliableEndpoint.openConnection('root-endpoint', function(event){
        assert.equal(event.status, "FAILED", "Verifying status");

        connectionFailedCaptured = true;
    })

    Promise.resolve()

    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))


    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))

    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
    .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))


    .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
    .then(argument.rootCapture.assertSilence.bind(null, 60))
    .then(argument.reliableCapture.assertSilence.bind(null, 0))

    .then(function(){
        assert.ok(connectionFailedCaptured, "Connection failed captured");
    })

    .then(argument.destroy)
    .then(done);
});
