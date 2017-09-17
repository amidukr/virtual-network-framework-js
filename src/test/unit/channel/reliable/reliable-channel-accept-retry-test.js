requirejs(["test/utils/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Accept Retry");
    ReliableTestUtils.reliableVnfTest("ReliableHub Accept Retry test", function(assert, argument) {});


    ReliableTestUtils.reliableVnfTest("Accept Retries: (Reliable<--Root) Connect established with extras sid, after sequence of ignore Accept Retry ", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
        })

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HANDSHAKE root1-2")) // Phantom message


        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HANDSHAKE root1-2")) // Phantom message

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        .then(function(){
            argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");
                argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-2");
            })
        })

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-2 rel1-2"]))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-2 root1-2 0 -1"))

        .then(function(){
            argument.reliableEndpoint.openConnection("root-endpoint", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");

                argument.destroy();
                done();
            });
        });
    });


    ReliableTestUtils.reliableVnfTest("Accept Retries: (Reliable<--Root) Accept retry openConnection succeed, with extra handshake attempt", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
        })

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

        .then(function(){
            argument.reliableEndpoint.openConnection("root-endpoint", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");

                argument.destroy();
                done();
            });
        })

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        // After accept failed test, reliable endpoint tries to complete open connection with extra handshake sequence
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-2 root1-2 0 -1"))

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HEARTBEAT root1-2 rel1-2"]))

    });

    ReliableTestUtils.reliableVnfTest("Accept Retries: (Reliable<--Root) Accept retry - openConnection fail", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableHub.setHeartbeatInterval(300);

        argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
        })

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))

        .then(function(){
            argument.reliableEndpoint.openConnection("root-endpoint", function(event){
                assert.equal(event.status, "FAILED", "Verifying status");

                argument.destroy();
                done();
            });
        })

        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))

        // After accept failed test, reliable endpoint tries to complete open connection with extra handshake sequence
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: HANDSHAKE rel1-2"]))
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint connection lost"]));
    });
});