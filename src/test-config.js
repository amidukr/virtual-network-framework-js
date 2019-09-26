    Timeouts = {}
    TestingProfiles = {}

    var TESTING_LEVEL_RELEASE = 0;
    var TESTING_LEVEL_INTEGRATION = 1;
    var TESTING_LEVEL_3RD_PARTY_UNRELIABLE = 2;
    var TESTING_LEVEL_STRESS = 3;

    TestingProfiles = {
        rate: 2,
        testLevel: TESTING_LEVEL_RELEASE,

        vnfWebSocketUrl: "ws://localhost:8080/vnf-ws",

        relative__qunitTestTimeout: 3000,
        relative__logCaptureTimeout: 3000,

        relative__reliableFastHeartbeatInterval: 50,
        relative__reliableFastConnectionInvalidateInterval: 500,
        relative__reliableFastConnectionLostTimeout: 1500,
        relative__reliableFastHandshakeRetryInterval: 150,
        relative__reliableFastKeepAliveHandshakingChannelTimeout: 600,

        reliableRtcHeartbeatInterval: 50,
        reliableRtcConnectionInvalidateInterval: 500,
        reliableRtcConnectionLostTimeout: 5000,


        //activeTestingLevel: TESTING_LEVEL_RELEASE,
        //activeTestingLevel: TESTING_LEVEL_INTEGRATION,
        //activeTestingLevel: TESTING_LEVEL_3RD_PARTY_UNRELIABLE,
        activeTestingLevel: TESTING_LEVEL_STRESS,

        "root:InMemory": {
            rate: 2,
            testLevel: TESTING_LEVEL_RELEASE
        },

        "root:Reliable": {
            rate: 10,
        },

        "root:Rtc": {
            rate: 5,

            testLevel: TESTING_LEVEL_3RD_PARTY_UNRELIABLE
        },

        "[Channel Integration Tests, Rtc] Connection close - recipient destroy" : {
            qunitTestTimeout:  10000,
            logCaptureTimeout: 10000
        },

        "root:ReliableRtc": {
            rate: 10,

            testLevel: TESTING_LEVEL_INTEGRATION,

            qunitTestTimeout:  30000,
            logCaptureTimeout: 30000
        },

        "[root:ReliableRtc]-[Reliable Hub v0.2] Connection Lost: by timeout" : {
            rate: 1,
            
            qunitTestTimeout:  30000,
            logCaptureTimeout: 30000
        },



        "[root:ReliableRtc] [Reliable Hub v0.2] Connection Lost: by timeout v2" : {
            rate: 1
        },

        "ReliableHub Connection Lost: [root:Rtc] [Reliable Hub v0.2] Connection Lost: by timeout" : {
            rate: 10
        },

        "[root:ReliableRtc] [Vnf System Tests]-[Unit] Service call failed: failed due to connection lost test" : {
            qunitTestTimeout:  35000,
            logCaptureTimeout: 35000
        },

        "[root:ReliableRtc] [Vnf System Tests]-[Unit] Service call failed: failed due to connection lost test" : {
            qunitTestTimeout:  40000,
            logCaptureTimeout: 40000
        },

        "[root:ReliableRtc] [Reliable Hub v0.2] ReliableHub Handshake Retry test" : {
            rate: 20
        },

        "[root:ReliableRtc, UnreliableHub] Generic Vnf Tests: Channel Verify Synchronous Destroy-Invalidate Call - Concurrent Join" : {
            rate: 30
        },

        "root:InMemory, ReliableWebSocketHub" : {
            qunitTestTimeout:  10000,
            logCaptureTimeout: 10000,

            testLevel: TESTING_LEVEL_INTEGRATION
        },



        "[root:InMemory, ReliableWebSocketHub] Generic Vnf Tests: Channel Double Message Send Test" : {
            enabled: false
        },

        "[root:InMemory, ReliableWebSocketHub] Generic Vnf Tests: Concurrent Connection Estabilish Test" : {
            enabled: false
        },

        "[root:InMemory, ReliableWebSocketHub] Generic Vnf Tests: Multiple/Loopback Channels Send Test" : {
            enabled: false
        },

        "[root:InMemory, ReliableWebSocketHub] Generic Vnf Tests: Channel Verify Synchronous Destroy Call - Concurrent Join" : {
            enabled: false
        },

        "[root:InMemory, ReliableWebSocketHub] Generic Vnf Tests: Channel Verify Synchronous Destroy-Invalidate Call - Concurrent Join" : {
            enabled: false
        },

        "[root:InMemory, ReliableWebSocketHub] Generic Vnf Tests: Channel Big Message Test" : {
            enabled: false
        },

        "[root:InMemory, ReliableWebSocketHub] Generic Vnf Tests: Channel Verify Synchronous Send" : {
            enabled: false
        },


        getValue: function(profileKey, config) {

            if(profileKey == null) {
                return TestingProfiles.getValue([], config);
            }

            if(typeof profileKey == "string") {
                return TestingProfiles.getValue([profileKey], config);
            }


            if(profileKey.constructor !== Array) throw new Error("Unexpected profile type: '" + profileKey + "'");


            for(var i = 0; i < profileKey.length; i++) {

                var profileConfigurations = TestingProfiles[profileKey[i]];

                if(!profileConfigurations) continue;

                var value = profileConfigurations[config];

                if(value != undefined) return value;
            }

            return TestingProfiles[config];
        },

        toAbsoluteInterval: function(profile, timePoints) {
            if(!timePoints) return;

            var rate = TestingProfiles.getValue(profile, "rate");
            return rate * timePoints;
        },

        getInterval: function(profile, config) {
            var absoluteIntervalValue = TestingProfiles.getValue(profile, config);

            if(absoluteIntervalValue) return absoluteIntervalValue;

            var relativeIntervalValue = TestingProfiles.getValue(profile, "relative__" + config);

            return TestingProfiles.toAbsoluteInterval(profile, relativeIntervalValue);
        }
    }

    QUnit.config.testTimeout   = TestingProfiles.getInterval(null, "qunitTestTimeout");
    Timeouts.logCaptureTimeout = TestingProfiles.getInterval(null, "logCaptureTimeout");


    Timeouts.iceSendTimeout = Math.min(Timeouts.logCaptureTimeout/10, 1000);

