requirejs(["vnf/vnf",
           "utils/signal-captor",
           "utils/logger",
           "test/utils/vnf-test-utils",
           "lib/bluebird"],
function(  Vnf,
           SignalCaptor,
           Log,
           VnfTestUtils,
           Promise){

    var RTCPeerConnection     = window.RTCPeerConnection     || window.mozRTCPeerConnection     || window.webkitRTCPeerConnection;
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
    var RTCIceCandidate       = window.RTCIceCandidate       || window.mozRTCIceCandidate       || window.webkitRTCIceCandidate;

    function logErrorCallback(){
        var stacktrace = new Error();
        return function(e) {
            window.RtcDebugLastError = e;
            Log.error("test-error", e + " see RtcDebugLastError for details");
            console.error(stacktrace);
        }

    }

    function logSuccess(e){}

    function captureMessage(captor) {
        return function onMessage(event) {
            Log.info("test-message", event.message);
            captor.signal(event.message);
        }
    }

    QUnit.module("RtcHub Unit")
    QUnit.test("[RtcHub Unit]: synchronous connect stress test", function(assert){
        Log.info("test", "[RtcHub Unit]: synchronous connect stress test");

        if(!VnfTestUtils.isTestingLevelEnabled(TESTING_LEVEL_STRESS)) {
            assert.ok(true, "Skipping test due to testing level");
            return;
        }

        QUnit.config.testTimeout = 60000;

        var n = 0;

        var done = assert.async(1);

        function doTest() {
            n++;

            var rtcHub = new Vnf.RtcHub(new Vnf.InBrowserHub());
            var endpoint1 = rtcHub.openEndpoint("vip-1");
            var endpoint2 = rtcHub.openEndpoint("vip-2");

            var captor1 = new SignalCaptor(assert);
            var captor2 = new SignalCaptor(assert);

            endpoint1.onMessage = VnfTestUtils.newPrintCallback(captor1, "vip-1");
            endpoint2.onMessage = VnfTestUtils.newPrintCallback(captor2, "vip-2");

            endpoint1.send("vip-2", "message-to-vip-2");
            endpoint2.send("vip-1", "message-to-vip-1");

            var failed = false;

            return Promise.resolve()
                .then(captor1.takeNext.bind(null, 1))
                .then(function(actual){
                    assert.deepEqual(actual, ["from vip-2: message-to-vip-1"],  "Expected: from vip-2: message-to-vip-1");
                    failed |= actual[0] != "from vip-2: message-to-vip-1";
                })

                .then(captor2.takeNext.bind(null, 1))
                .then(function(actual){
                    assert.deepEqual(actual, ["from vip-1: message-to-vip-2"],  "Expected: from vip-1: message-to-vip-2");
                    failed |= actual[0] != "from vip-1: message-to-vip-2";
                })


                .then(endpoint1.destroy)
                .then(endpoint2.destroy)

                .then(function(){
                    if(n < 100 && !failed) {
                        return doTest();
                    }
                });
        }

        Promise.resolve()
        .then(doTest)
        .then(done);

    })

    VnfTestUtils.vnfTest("[RtcHub Unit]: rtc initiate connection test", function(assert, argument){
        var done = assert.async(1);

        var rootHub = argument.rootHubFactory();
        var rtcHub = new Vnf.RtcHub(rootHub);

        var rtcEndpoint  = rtcHub.openEndpoint("rtc-endpoint");
        var rootEndpoint = rootHub.openEndpoint("root-endpoint");

        var rtcCaptor  = new SignalCaptor(assert);
        var rootCaptor = new SignalCaptor(assert);

        rtcEndpoint.onMessage  = captureMessage(rtcCaptor)
        rootEndpoint.onMessage = captureMessage(rootCaptor);

        rtcEndpoint.send("root-endpoint", "message-1");

        var rtcConnection;
        var dataChannel;

        Promise.resolve()
         .then(rootCaptor.takeNext.bind(null, 1))
         .then(function(message) {
            assert.equal(message[0].type, "rtc-connection", "Asserting message type is rtc-connection");
            assert.equal(message[0].requestForNewConnection, true, "Asserting requestForNewConnection");

            rtcConnection = new RTCPeerConnection(vnfRtcServers);

            var ice = {candidate: [], sdp: null}

            rtcConnection.onicecandidate = function(evt){
                Log.info("test", "on ice candidate")
                if(evt.candidate != null) {
                    ice.candidate.push(evt.candidate);
                }else{
                    Log.info("test", "Send rtc ice candidates")

                    assert.notEqual(ice.sdp, null, "Asserting ice sdp is not null");

                    rootEndpoint.send("rtc-endpoint", {type: "rtc-connection",
                                                       requestForNewConnection: false,
                                                       ice: ice,
                                                       connectionCreateDate: self.createDate})
                }
            };

            rtcConnection.ondatachannel = function(evt){
                Log.info("test", ["ondatachannel: ", evt]);

                dataChannel = evt.channel;

                dataChannel.onmessage = function(e) {
                    rootCaptor.signal(e.data);
                }
            }

            rtcConnection.setRemoteDescription(new RTCSessionDescription(message[0].ice.sdp));

            rtcConnection.createAnswer(function(desc){
                Log.info("test", "Answer created")

                for(var i = 0; i < message[0].ice.candidate.length; i++) {
                    rtcConnection.addIceCandidate(new RTCIceCandidate(message[0].ice.candidate[i]));
                }

                rtcConnection.setLocalDescription(desc);
                ice.sdp = desc;
            }, logErrorCallback());

         })

         .then(rootCaptor.assertSignals.bind(null, "S19message-1"))

         .then(function(){
            dataChannel.send("S19message-2");
         })

         .then(rtcCaptor.assertSignals.bind(null, "message-2"))

         .then(rootEndpoint.destroy)
         .then(rtcEndpoint.destroy)

         .then(done);
    });

    VnfTestUtils.vnfTest("[RtcHub Unit]: rtc accept connection test", function(assert, argument){
        var done = assert.async(1);

        var rootHub = argument.rootHubFactory();
        var rtcHub = new Vnf.RtcHub(rootHub);

        var rtcEndpoint  = rtcHub.openEndpoint("rtc-endpoint");
        var rootEndpoint = rootHub.openEndpoint("root-endpoint");

        var rtcCaptor  = new SignalCaptor(assert);
        var rootCaptor = new SignalCaptor(assert);

        rtcEndpoint.onMessage  = captureMessage(rtcCaptor)
        rootEndpoint.onMessage = captureMessage(rootCaptor);

        var rtcConnection = new RTCPeerConnection(vnfRtcServers);
        var ice = {candidate: [], sdp: null}

        var ice = {candidate: [], sdp: null}

        rtcConnection.onicecandidate = function(evt){
            Log.info("test", "on ice candidate")
            if(evt.candidate != null) {
                ice.candidate.push(evt.candidate);
            }else{
                Log.info("test", "Send rtc ice candidates")

                assert.notEqual(ice.sdp, null, "Asserting ice sdp is not null");

                rootEndpoint.send("rtc-endpoint", {type: "rtc-connection",
                                                   requestForNewConnection: true,
                                                   ice: ice,
                                                   connectionCreateDate: self.createDate})
            }
        };

        var dataChannel = rtcConnection.createDataChannel("data");
        dataChannel.onopen = function(event) {
            Log.info("test", "Data Channel opened")

            dataChannel.send("S19message-1");
        }

        dataChannel.onmessage = function(e) {
            rootCaptor.signal(e.data);
        }

        rtcConnection.createOffer(function(desc){
            Log.info("test", "Offer created")
            rtcConnection.setLocalDescription(desc);
            ice.sdp = desc;
        }, logErrorCallback());


        Promise.resolve()
         .then(rootCaptor.takeNext.bind(null, 1))
         .then(function(message) {
            assert.equal(message[0].type, "rtc-connection", "Asserting message type is rtc-connection");
            assert.equal(message[0].requestForNewConnection, false, "Asserting requestForNewConnection");

            rtcConnection.setRemoteDescription(new RTCSessionDescription(message[0].ice.sdp));

            for(var i = 0; i < message[0].ice.candidate.length; i++) {
                rtcConnection.addIceCandidate(new RTCIceCandidate(message[0].ice.candidate[i]));
            }
         })

         .then(rtcCaptor.assertSignals.bind(null, "message-1"))
         .then(rtcEndpoint.send.bind(null, "root-endpoint", "message-2"))
         .then(rootCaptor.assertSignals.bind(null, "S19message-2"))

         .then(rootEndpoint.destroy)
         .then(rtcEndpoint.destroy)

         .then(done);
    });

    VnfTestUtils.vnfTest("[RtcHub Unit]: rtc synchronous connection establish test", function(assert, argument){
        var done = assert.async(1);

        var rootHub = argument.rootHubFactory();
        var rtcHub = new Vnf.RtcHub(rootHub);

        var rtcEndpoint  = rtcHub.openEndpoint("rtc-endpoint");
        var rootEndpoint = rootHub.openEndpoint("root-endpoint");

        var rtcCaptor  = new SignalCaptor(assert);
        var rootCaptor = new SignalCaptor(assert);

        rtcEndpoint.onMessage  = captureMessage(rtcCaptor)
        rootEndpoint.onMessage = captureMessage(rootCaptor);

        rtcEndpoint.send("root-endpoint", "message-1");

        var rtcConnection;
        var dataChannel;

        Promise.resolve()
         .then(rootCaptor.takeNext.bind(null, 1))
         .then(function(message){
            assert.equal(message[0].type, "rtc-connection", "Asserting message type is rtc-connection");
            assert.equal(message[0].requestForNewConnection, true, "Asserting requestForNewConnection");

            rtcConnection = new RTCPeerConnection(vnfRtcServers);
            var ice = {candidate: [], sdp: null}

            rtcConnection.onicecandidate = function(evt){
                Log.info("test", "on ice candidate")
                if(evt.candidate != null) {
                    ice.candidate.push(evt.candidate);
                }else{
                    Log.info("test", "Send rtc ice candidates")

                    assert.notEqual(ice.sdp, null, "Asserting ice sdp is not null");

                    rootEndpoint.send("rtc-endpoint", {type: "rtc-connection",
                                                       requestForNewConnection: true,
                                                       ice: ice,
                                                       connectionCreateDate: self.createDate})
                }
            };

            dataChannel = rtcConnection.createDataChannel("data");
            dataChannel.onopen = function(event) {
                Log.info("test", "Data Channel opened")

                dataChannel.send("S19message-2");
            }

            dataChannel.onmessage = function(e) {
                rootCaptor.signal(e.data);
            }

            rtcConnection.createOffer(function(desc){
                Log.info("test", "Offer created")
                rtcConnection.setLocalDescription(desc);
                ice.sdp = desc;
            }, logErrorCallback());

         })

         .then(rootCaptor.takeNext.bind(null, 1))
         .then(function(message){
             if(message[0].requestForNewConnection) return;

             assert.equal(message[0].type, "rtc-connection", "Asserting message type is rtc-connection");
             assert.equal(message[0].requestForNewConnection, false, "Asserting requestForNewConnection");

             rtcConnection.setRemoteDescription(new RTCSessionDescription(message[0].ice.sdp));

             for(var i = 0; i < message[0].ice.candidate.length; i++) {
                 rtcConnection.addIceCandidate(new RTCIceCandidate(message[0].ice.candidate[i]));
             }
         })

         .then(rootCaptor.assertSignals.bind(null, "S19message-1"))
         .then(rtcCaptor.assertSignals.bind(null, "message-2"))

         .then(rootEndpoint.destroy)
         .then(rtcEndpoint.destroy)

         .then(done);
    });
});