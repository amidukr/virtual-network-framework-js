requirejs(["test/utils/reliable-test-utils"],
function( ReliableTestUtils){

    QUnit.module("ReliableHub Handshake");
    ReliableTestUtils.reliableVnfTest("Handshakes: (Reliable<--Root) Test handshake accept sequence for reliable endpoint", function(assert, argument) {
        var done = assert.async(1);

        argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
            argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");
        })

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ["from reliable-endpoint: ACCEPT root1-1 rel1-1"]))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))

        .then(function() {
            argument.reliableEndpoint.openConnection("root-endpoint", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying status");

                argument.destroy();
                done();
            });
        });
    });


    ReliableTestUtils.reliableVnfTest("Handshakes: (Reliable-->Root) Test handshake initiation sequence by reliable endpoint", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying status");
        });

        Promise.resolve()
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1']))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root1-1"))
        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))

        .then(argument.destroy)
        .then(done);
    });

    ReliableTestUtils.reliableVnfTest("Handshakes: (Reliable<->Root) Test concurrent synchronous handshake-accept sequence initiation", function(assert, argument) {
        var done = assert.async(1);

        argument.reliableEndpoint.openConnection("root-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Reliable connected");
        });

        argument.rootEndpoint.openConnection("reliable-endpoint", function(event){
            argument.rootEndpoint.send("reliable-endpoint", "HANDSHAKE root1-1");

        })

        Promise.resolve()

        .then(argument.rootCapture.assertSignalsUnordered.bind(null, ['from reliable-endpoint: HANDSHAKE rel1-1',
                                                                      'from reliable-endpoint: ACCEPT root1-1 rel1-1']))

        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "ACCEPT rel1-1 root1-1"))
        .then(argument.rootEndpoint.send.bind(null, "reliable-endpoint", "HEARTBEAT rel1-1 root1-1 0 -1"))

        .then(argument.rootCapture.assertSignals.bind(null, ['from reliable-endpoint: HEARTBEAT root1-1 rel1-1 0 -1']))

        .then(argument.destroy)
        .then(done);
    });
})