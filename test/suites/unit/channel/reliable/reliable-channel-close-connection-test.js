import {ReliableTestUtils} from "../../../../utils/reliable-test-utils.js";
import {sleeper} from "../../../../../src/utils/promise-utils.js";

QUnit.module("ReliableHub Connection Close", () => {
    ReliableTestUtils.reliableVnfTest("Close connection sequence initiated by reliable", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(50);
        argument.reliableHub.setConnectionInvalidateInterval(100);
        argument.reliableHub.setConnectionLostTimeout(200);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-ACCEPT rel1-1 root1-1"))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Close connection sends CLOSE-CONNECTION immediately", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(100000);
        argument.reliableHub.setConnectionInvalidateInterval(100000);
        argument.reliableHub.setConnectionLostTimeout(100000);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Close connection sequence initiated by rtc", function(assert, argument) {
            argument.reliableHub.setHeartbeatInterval(50);
            argument.reliableHub.setConnectionInvalidateInterval(100);
            argument.reliableHub.setConnectionLostTimeout(200);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Should reply with close-accept to close connection message in any state", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(50);
        argument.reliableHub.setConnectionInvalidateInterval(100);
        argument.reliableHub.setConnectionLostTimeout(200);

        var done = assert.async(1);

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ["openConnection captured"]))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel-session root-session"))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root-session rel-session"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.reliableCapture.assertSilence.bind(null))

        .then(argument.destroy)
        .then(done);

        argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");

            argument.rootCapture.signal("openConnection captured");
        });
    });

    ReliableTestUtils.reliableVnfTest("CLOSE-CONNECTION heartbeats after connection lost", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(50);
        argument.reliableHub.setConnectionInvalidateInterval(100);
        argument.reliableHub.setConnectionLostTimeout(200);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });


    ReliableTestUtils.reliableVnfTest("Phantom message should not break CLOSE-CONNECTION series", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(50);
        argument.reliableHub.setConnectionInvalidateInterval(100);
        argument.reliableHub.setConnectionLostTimeout(200);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT root1-1 wrong-rel1-1"))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Phantom close-accept message should not break CLOSE-CONNECTION series", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(50);
        argument.reliableHub.setConnectionInvalidateInterval(100);
        argument.reliableHub.setConnectionLostTimeout(200);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-ACCEPT root1-1 wrong-rel1-1"))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Immedidate CLOSE-CONNECTION heartbeat if connection re-opend by connection closer", function(assert, argument) {
        argument.rootHub.setImmediateSend(false);
        argument.reliableHub.setHeartbeatInterval(100000);
        argument.reliableHub.setConnectionInvalidateInterval(100000);
        argument.reliableHub.setConnectionLostTimeout(100000);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root1-1 rel1-1"]))
        .then(argument.rootEndpoint.closeConnection.bind(null, "reliable-endpoint"))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootEndpoint.openConnection.bind(null, "reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");

            argument.rootCapture.signal("openConnection captured");
        }))
        .then(argument.rootCapture.assertSignals.bind(null, ["openConnection captured"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(sleeper(100))
        .then(argument.rootCapture.assertSilence.bind(null))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Immedidate CLOSE-CONNECTION heartbeat if connection re-opend by connection close acceptor", function(assert, argument) {
        argument.rootHub.setImmediateSend(false);
        argument.reliableHub.setHeartbeatInterval(100000);
        argument.reliableHub.setConnectionInvalidateInterval(100000);
        argument.reliableHub.setConnectionLostTimeout(100000);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootEndpoint.closeConnection.bind(null, "reliable-endpoint"))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootEndpoint.openConnection.bind(null, "reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");

            argument.rootCapture.signal("openConnection captured");
        }))

        .then(argument.rootCapture.assertSignals.bind(null, ["openConnection captured"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))


        .then(sleeper(100))

        .then(argument.rootCapture.assertSilence.bind(null))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("CLOSE-CONNECTION heartbeat if connection re-opend by connection closer, and parent connection wil be closed", function(assert, argument) {
        argument.rootHub.setImmediateSend(false);
        argument.reliableHub.setHeartbeatInterval(100);
        argument.reliableHub.setConnectionInvalidateInterval(200);
        argument.reliableHub.setConnectionLostTimeout(400);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "CLOSE-CONNECTION rel1-1 root1-1"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-ACCEPT root1-1 rel1-1"]))
        .then(argument.rootEndpoint.closeConnection.bind(null, "reliable-endpoint"))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootEndpoint.openConnection.bind(null, "reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");

            argument.rootCapture.signal("openConnection captured");
        }))
        .then(argument.rootCapture.assertSignals.bind(null, ["openConnection captured"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("CLOSE-CONNECTION heartbeat if connection re-opend by connection close acceptor, and parent connection wil be closed", function(assert, argument) {
        argument.rootHub.setImmediateSend(false);
        argument.reliableHub.setHeartbeatInterval(100);
        argument.reliableHub.setConnectionInvalidateInterval(200);
        argument.reliableHub.setConnectionLostTimeout(400);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootEndpoint.closeConnection.bind(null, "reliable-endpoint"))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootEndpoint.openConnection.bind(null, "reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying connection status");

            argument.rootCapture.signal("openConnection captured");
        }))

        .then(argument.rootCapture.assertSignals.bind(null, ["openConnection captured"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Parent closed connection should not be recovered by CLOSE-CONNECTION heartbeats If Reliable state is CONNECTION-CLOSED", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(50);
        argument.reliableHub.setConnectionInvalidateInterval(100);
        argument.reliableHub.setConnectionLostTimeout(200);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootEndpoint.closeConnection.bind(null, "reliable-endpoint"))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(sleeper(500))

        .then(argument.rootCapture.assertSilence.bind(null))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Close-connection series should be stopped, if new connection changed to handshaking", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(100);
        argument.reliableHub.setConnectionInvalidateInterval(1000);
        argument.reliableHub.setConnectionLostTimeout(400);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.reliableEndpoint.openConnection.bind(null, "root-endpoint", function(){}))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION undefined rel1-2"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION undefined rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION undefined rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION undefined rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION undefined rel1-2"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Close-connection series should be stopped, if new connection changed to accepting ", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(100);
        argument.reliableHub.setConnectionInvalidateInterval(1000);
        argument.reliableHub.setConnectionLostTimeout(400);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.closeConnection.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HANDSHAKE root1-2"))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-2 rel1-2"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-2 rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-2 rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-2 rel1-2"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-2 rel1-2"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-2 rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-2 rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-2 rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-2 rel1-2"]))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    })

    ReliableTestUtils.reliableVnfTest("Destroy should send close-connection immediately", function(assert, argument) {
        argument.reliableHub.setHeartbeatInterval(100000);
        argument.reliableHub.setConnectionInvalidateInterval(100000);
        argument.reliableHub.setConnectionLostTimeout(100000);

        var done = assert.async(1);

        argument.makeConnection()
        .then(argument.reliableEndpoint.destroy.bind(null, "root-endpoint"))
        .then(argument.reliableCapture.assertSignals.bind(null, ["from root-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: CLOSE-CONNECTION root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(argument.destroy)
        .then(done);
    })

});