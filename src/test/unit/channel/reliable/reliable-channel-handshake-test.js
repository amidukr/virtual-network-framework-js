requirejs(["test/utils/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Handshake");
    ReliableTestUtils.reliableVnfTest("Handshakes: (Reliable<--Root) Test handshake accept sequence for reliable endpoint and message send", function(assert, argument) {
        var done = assert.async(1);

        argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
        })

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.send.bind(null, "root-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))

        .then(function() {
            argument.reliableEndpoint.openConnection("root-endpoint", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");

                argument.reliableEndpoint.send("root-endpoint", "message1");
                argument.reliableEndpoint.send("root-endpoint", "message2");

                argument.rootEndpoint.send("reliable-endpoint", "MESSAGE rel1-1 0 message3");
                argument.rootEndpoint.send("reliable-endpoint", "MESSAGE rel1-1 0 message3");
                argument.rootEndpoint.send("reliable-endpoint", "MESSAGE rel1-1 1 message4");
            });
        })

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 0 message1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 1 message2']))

        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message4']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Handshakes: (Reliable<--Root) Test handshake accept sequence for reliable endpoint and reply with message", function(assert, argument) {
        var done = assert.async(1);

        argument.rootEndpoint.openConnection("reliable-endpoint", function(){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
        })

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootCapture.send.bind(null, "root-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))

        .then(argument.rootCapture.send.bind(null, "root-endpoint", "MESSAGE rel1-1 0 message1"))
        .then(argument.rootCapture.send.bind(null, "root-endpoint", "MESSAGE rel1-1 1 message2"))

        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message1']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message2']))

        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message3"))
        .then(argument.reliableEndpoint.send.bind(null, 'root-endpoint', "message4"))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 0 message3']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 1 message4']))

        .then(argument.destroy)
        .then(done);
    });


    ReliableTestUtils.reliableVnfTest("Handshakes: (Reliable-->Root) Test handshake initiation sequence by reliable endpoint and message send", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");

            argument.reliableEndpoint.send("root-endpoint", "message1");
            argument.reliableEndpoint.send("root-endpoint", "message2");

            argument.rootEndpoint.send("reliable-endpoint", "MESSAGE rel1-1 0 message3");
            argument.rootEndpoint.send("reliable-endpoint", "MESSAGE rel1-1 1 message4");
        });

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootCapture.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root1-1"))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 0 -1']))

        .then(argument.reliableCapture.assertSignals.bind(null, ['connection to root-endpoint opened']))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 0 message1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 1 message2']))

        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message4']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Handshakes: (Reliable<->Root) Test concurrent synchronous handshake-accept sequence initiation", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
        });

        argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
            argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");

            argument.reliableEndpoint.send("root-endpoint", "message1");
            argument.reliableEndpoint.send("root-endpoint", "message2");

            argument.rootEndpoint.send("reliable-endpoint", "MESSAGE rel1-1 0 message3");
            argument.rootEndpoint.send("reliable-endpoint", "MESSAGE rel1-1 1 message4");
        })

        Promise.resolve()

        .then(argument.rootCapture.assertSignalsUnordered.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1',
                                                                      'from reliable-endpoint: ACCEPT root1-1 rel1-1']))

        .then(argument.rootCapture.send.bind(null, "root-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))
        .then(argument.rootCapture.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root1-1"))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))


        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 0 message1']))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: MESSAGE root1-1 1 message2']))

        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message3']))
        .then(argument.reliableCapture.assertSignals.bind(null, ['from root-endpoint: message4']))

        .then(argument.destroy)
        .then(done);
    });
})