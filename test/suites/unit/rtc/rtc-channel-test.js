import {Vnf} from "../../../../src/vnf/vnf.js"

import {SignalCaptor} from "../../../../src/utils/signal-captor.js"
import {Log} from "../../../../src/utils/logger.js"

import {VnfTestUtils} from "../../../utils/vnf-test-utils.js"


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
VnfTestUtils.vnfTest({description: "[RtcHub Unit]: rtc initiate connection test", callback: function(assert, argument){
    var done = assert.async(1);

    var rootHub = argument.rootHubFactory();
    var rtcHub = new Vnf.RtcHub(rootHub);

    var rtcEndpoint  = rtcHub.openEndpoint("rtc-endpoint");
    var rootEndpoint = rootHub.openEndpoint("root-endpoint");

    var rtcCaptor  = new SignalCaptor(assert);
    var rootCaptor = new SignalCaptor(assert);
    var rtcChannelCaptor = new SignalCaptor(assert);

    rtcEndpoint.onMessage  = captureMessage(rtcCaptor)
    rootEndpoint.onMessage = captureMessage(rootCaptor);
    rtcEndpoint.onConnectionLost(function(targetVip) {
        rtcCaptor.signal(`connection to ${targetVip} closed`);
    });

    rtcEndpoint.openConnection("root-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");
        rtcEndpoint.send("root-endpoint", "message-1");
    });

    var rtcConnection;
    var dataChannel;

    Promise.resolve()
     .then(rootCaptor.takeNext.bind(null, 1))
     .then(function(messageString) {
        var message = JSON.parse(messageString[0]);

        assert.equal(message.type, "rtc-connection", "Asserting message type is rtc-connection");
        assert.equal(message.requestForNewConnection, true, "Asserting requestForNewConnection");

        rtcConnection = new RTCPeerConnection(vnfRtcServers);

        var ice = {candidate: [], sdp: null}

        rtcConnection.onicecandidate = function(evt){
            Log.info("test", "on ice candidate")
            if(evt.candidate != null) {
                ice.candidate.push(evt.candidate);
            }else{
                Log.info("test", "Send rtc ice candidates")

                assert.notEqual(ice.sdp, null, "Asserting ice sdp is not null");

                rootEndpoint.send("rtc-endpoint", JSON.stringify({type: "rtc-connection",
                                                                  requestForNewConnection: false,
                                                                  ice: ice,
                                                                  connectionCreateDate: self.createDate}));
            }
        };

        rtcConnection.ondatachannel = function(evt){
            Log.info("test", ["ondatachannel: ", evt]);

            dataChannel = evt.channel;

            dataChannel.onmessage = function(e) {
                rtcChannelCaptor.signal(e.data);
            }
        }

        rtcConnection.setRemoteDescription(new RTCSessionDescription(message.ice.sdp));

        rtcConnection.createAnswer(function(desc){
            Log.info("test", "Answer created")

            for(var i = 0; i < message.ice.candidate.length; i++) {
                rtcConnection.addIceCandidate(new RTCIceCandidate(message.ice.candidate[i]));
            }

            rtcConnection.setLocalDescription(desc);
            ice.sdp = desc;
        }, logErrorCallback());

     })

     .then(rtcChannelCaptor.assertSignals.bind(null, "message-1"))

     .then(function(){
        dataChannel.send("message-2");
     })

     .then(rtcCaptor.assertSignals.bind(null, "message-2"))
     .then(rtcCaptor.assertSilence.bind(null))

     .then(() => {
        dataChannel.close();
      })

     .then(rtcCaptor.assertSignals.bind(null, "connection to root-endpoint closed"))

     .then(rtcCaptor.assertSilence.bind(null))
     .then(rootCaptor.assertSilence.bind(null))

     .then(rootEndpoint.destroy)
     .then(rtcEndpoint.destroy)

     .then(done);
}});

VnfTestUtils.vnfTest({description: "[RtcHub Unit]: rtc accept connection test", callback: function(assert, argument){
    var done = assert.async(1);

    var rootHub = argument.rootHubFactory();
    var rtcHub = new Vnf.RtcHub(rootHub);

    var rtcEndpoint  = rtcHub.openEndpoint("rtc-endpoint");
    var rootEndpoint = rootHub.openEndpoint("root-endpoint");

    var rtcCaptor  = new SignalCaptor(assert);
    var rootCaptor = new SignalCaptor(assert);
    var rtcChannelCaptor = new SignalCaptor(assert);


    rtcEndpoint.onMessage  = captureMessage(rtcCaptor)
    rootEndpoint.onMessage = captureMessage(rootCaptor);
    rtcEndpoint.onConnectionLost(function(targetVip) {
        rtcCaptor.signal(`connection to ${targetVip} closed`);
    });

    var rtcConnection = new RTCPeerConnection(vnfRtcServers);

    var ice = {candidate: [], sdp: null};

    rtcConnection.onicecandidate = function(evt){
        Log.info("test", "on ice candidate")
        if(evt.candidate != null) {
            ice.candidate.push(evt.candidate);
        }else{
            Log.info("test", "Send rtc ice candidates")

            assert.notEqual(ice.sdp, null, "Asserting ice sdp is not null");

            rootEndpoint.openConnection("rtc-endpoint", function(event){
                assert.equal(event.status, "CONNECTED", "Verifying connection status");
                rootEndpoint.send("rtc-endpoint", JSON.stringify({type: "rtc-connection",
                                                                  requestForNewConnection: true,
                                                                  ice: ice,
                                                                  connectionCreateDate: self.createDate}));
            })

        }
    };

    var dataChannel = rtcConnection.createDataChannel("data");
    dataChannel.onopen = function(event) {
        Log.info("test", "Data Channel opened")

        dataChannel.send("message-1");
    }

    dataChannel.onmessage = function(e) {
        rtcChannelCaptor.signal(e.data);
    }

    rtcConnection.createOffer(function(desc){
        Log.info("test", "Offer created")
        rtcConnection.setLocalDescription(desc);
        ice.sdp = desc;
    }, logErrorCallback());


    Promise.resolve()
     .then(rootCaptor.takeNext.bind(null, 1))
     .then(function(messageString) {
        var message = JSON.parse(messageString[0]);

        assert.equal(message.type, "rtc-connection", "Asserting message type is rtc-connection");
        assert.equal(message.requestForNewConnection, false, "Asserting requestForNewConnection");

        rtcConnection.setRemoteDescription(new RTCSessionDescription(message.ice.sdp));

        for(var i = 0; i < message.ice.candidate.length; i++) {
            rtcConnection.addIceCandidate(new RTCIceCandidate(message.ice.candidate[i]));
        }
     })

     .then(rtcCaptor.assertSignals.bind(null, "message-1"))
     .then(rtcEndpoint.send.bind(null, "root-endpoint", "message-2"))
     .then(rtcChannelCaptor.assertSignals.bind(null, "message-2"))

     .then(() => {
         dataChannel.close();
     })

     .then(rtcCaptor.assertSignals.bind(null, "connection to root-endpoint closed"))

     .then(rtcCaptor.assertSilence.bind(null))
     .then(rootCaptor.assertSilence.bind(null))

     .then(rootEndpoint.destroy)
     .then(rtcEndpoint.destroy)

     .then(done);
}});

VnfTestUtils.vnfTest({description: "[RtcHub Unit]: rtc synchronous connection establish test", callback: function(assert, argument){
    var done = assert.async(1);

    var rootHub = argument.rootHubFactory();
    var rtcHub = new Vnf.RtcHub(rootHub);

    var rtcEndpoint  = rtcHub.openEndpoint("rtc-endpoint");
    var rootEndpoint = rootHub.openEndpoint("root-endpoint");

    var rtcCaptor  = new SignalCaptor(assert);
    var rootCaptor = new SignalCaptor(assert);

    rtcEndpoint.onMessage  = captureMessage(rtcCaptor)
    rootEndpoint.onMessage = captureMessage(rootCaptor);

    rtcEndpoint.openConnection("root-endpoint", function(event){
        assert.equal(event.status, "CONNECTED", "Verifying connection status");
        rtcEndpoint.send("root-endpoint", "message-1");
    })


    var rtcConnection;
    var dataChannel;

    Promise.resolve()
     .then(rootCaptor.takeNext.bind(null, 1))
     .then(function(messageString){
        var message = JSON.parse(messageString[0]);

        assert.equal(message.type, "rtc-connection", "Asserting message type is rtc-connection");
        assert.equal(message.requestForNewConnection, true, "Asserting requestForNewConnection");

        rtcConnection = new RTCPeerConnection(vnfRtcServers);
        var ice = {candidate: [], sdp: null}

        rtcConnection.onicecandidate = function(evt){
            Log.info("test", "on ice candidate")
            if(evt.candidate != null) {
                ice.candidate.push(evt.candidate);
            }else{
                Log.info("test", "Send rtc ice candidates")

                assert.notEqual(ice.sdp, null, "Asserting ice sdp is not null");

                rootEndpoint.openConnection("rtc-endpoint", function(event){
                    assert.equal(event.status, "CONNECTED", "Verifying connection status");
                    rootEndpoint.send("rtc-endpoint", JSON.stringify({type: "rtc-connection",
                                                                      requestForNewConnection: true,
                                                                      ice: ice,
                                                                      connectionCreateDate: self.createDate}))
                });
            }
        };

        dataChannel = rtcConnection.createDataChannel("data");
        dataChannel.onopen = function(event) {
            Log.info("test", "Data Channel opened")

            dataChannel.send("message-2");
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
     .then(function(messageString){
        var message = JSON.parse(messageString[0]);

         if(message.requestForNewConnection) return;

         assert.equal(message.type, "rtc-connection", "Asserting message type is rtc-connection");
         assert.equal(message.requestForNewConnection, false, "Asserting requestForNewConnection");

         rtcConnection.setRemoteDescription(new RTCSessionDescription(message.ice.sdp));

         for(var i = 0; i < message.ice.candidate.length; i++) {
             rtcConnection.addIceCandidate(new RTCIceCandidate(message.ice.candidate[i]));
         }
     })

     .then(rootCaptor.assertSignals.bind(null, "message-1"))
     .then(rtcCaptor.assertSignals.bind(null, "message-2"))

     .then(rootEndpoint.destroy)
     .then(rtcEndpoint.destroy)

     .then(done);
}});


QUnit.test("[RtcHub Unit]: connection should failed if no response from other side", function(assert){
    var done = assert.async(1);

    var rootHub = new Vnf.InBrowserHub();
    var rtcHub = new Vnf.RtcHub(rootHub);

    var rtcEndpoint  = rtcHub.openEndpoint("rtc-endpoint");
    var rootEndpoint = rootHub.openEndpoint("second-endpoint");

    rtcHub.setEstablishConnectionTimeout(300);

    rtcEndpoint.openConnection("second-endpoint", function(event){
        assert.equal(event.status, "FAILED", "Check that connect failed to empty endpoint");

        rootEndpoint.destroy();

        var secondRtcEndpoint = rtcHub.openEndpoint("second-endpoint");

        rtcEndpoint.openConnection("second-endpoint", function(event){
            assert.equal(event.status, "CONNECTED", "Verifying that connected to another rtc");

            secondRtcEndpoint.destroy();
            rtcEndpoint.destroy();
            done();
        })
    });
});
