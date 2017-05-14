define(["vnf/vnf", "utils/logger"], function(Vnf, Log){

    var runningTest = "";

    var VnfTestUtils = {

        isTestingLevelEnabled: function(testLevel, testProfile) {
            var activeTestingLevel = TestingProfiles.getValue(testProfile, "activeTestingLevel");
            return activeTestingLevel >= testLevel;
        },

        isTestEnabled: function(testProfile) {
            var testLevel = TestingProfiles.getValue(testProfile, "testLevel");

            return VnfTestUtils.isTestingLevelEnabled(testLevel, testProfile);
        },

        test: function(testProfile, shortDescription, args, callback) {
            var description = "["+testProfile+"]-" + shortDescription;

            if(!VnfTestUtils.isTestEnabled(testProfile)) {
                return;
            }

            QUnit.test(description, function(assert){
                Log.info("test", description);
                runningTest = description;

                QUnit.config.testTimeout   = TestingProfiles.getInterval(testProfile, "qunitTestTimeout");
                Timeouts.logCaptureTimeout = TestingProfiles.getInterval(testProfile, "logCaptureTimeout");

                if(window.vnfActiveEndpoints.length > 0) {
                    Log.warn("test", ["Active endpoints left: ", window.vnfActiveEndpoints]);
                    var vnfActiveEndpointsClone = window.vnfActiveEndpoints.slice();
                    for(var i = 0; i < vnfActiveEndpointsClone.length; i++) {
                        try{
                            vnfActiveEndpointsClone[i].destroy();
                        }catch(e) {
                            Log.warn("test", ["Exception during endpoint destroy: ", e]);
                        }
                    }
                }

                var assertAsync = assert.async;
                assert.async = function(num) {
                    var assertDone = assertAsync.call(assert, num);
                    return function proxyDone() {

                        if(runningTest != description) {
                            throw new Error("Wrong call to done, test already executed: " + description + ", while running " + runningTest);
                        }

                        assertDone();
                    }
                }



                if(callback == undefined) {
                    callback = args;
                    args = {};
                }

                function getInterval(config) {
                    return TestingProfiles.getInterval(testProfile, config)
                }

                function toAbsoluteInterval(timePoints) {
                    return TestingProfiles.toAbsoluteInterval(testProfile, timePoints)
                }

                if(typeof args == 'function') {
                    args = args();
                }

                args = Object.assign({}, {testProfile: testProfile,
                                          testDescription: description,
                                          getInterval: getInterval,
                                          toAbsoluteInterval: toAbsoluteInterval},
                                     args)

                return callback(assert, args);
            });
        },

        vnfTest: function(description, argumentProcessor, callback) {

            if(callback == undefined) {
                callback = argumentProcessor;
                argumentProcessor = function(value){return value;};
            }

            function inMemoryFactory() {return new Vnf.InBrowserHub();};
            function rtcHubFactory() {return new Vnf.RTCHub(new Vnf.InBrowserHub());};

            function reliableRtcHubFactory() {
                var reliableRTC = new Vnf.ReliableRTCHub(new Vnf.InBrowserHub());

                reliableRTC.setHeartbeatInterval(                 TestingProfiles.getInterval("root:ReliableRTC", "reliableRTCHeartbeatInterval"));
                reliableRTC.setConnectionInvalidateInterval(      TestingProfiles.getInterval("root:ReliableRTC", "reliableRTCConnectionInvalidateInterval"));
                reliableRTC.setConnectionLostTimeout(             TestingProfiles.getInterval("root:ReliableRTC", "reliableRTCConnectionLostTimeout"));
                reliableRTC.setHandshakeRetryInterval(            TestingProfiles.getInterval("root:ReliableRTC", "reliableRTCHandshakeRetryInterval"));
                reliableRTC.setKeepAliveHandshakingChannelTimeout(TestingProfiles.getInterval("root:ReliableRTC", "reliableRTCKeepAliveHandshakingChannelTimeout"));

                reliableRTC.setHandshakeRetries(10);

                return reliableRTC;
            };

            var proxyCallback = function proxyCallback(assert, args) {
                return callback(assert, Object.assign({}, argumentProcessor(assert, args), args));
            };

            VnfTestUtils.test("root:InMemory",    description, {rootHubFactory: inMemoryFactory},       proxyCallback);
            VnfTestUtils.test("root:RTC",         description, {rootHubFactory: rtcHubFactory},         proxyCallback);
            VnfTestUtils.test("root:ReliableRTC", description, {rootHubFactory: reliableRtcHubFactory}, proxyCallback);

        },

        newPrintCallback: function (captor, instance, version) {
            return function onMessage(event) {
                var message = event.message;
                if(typeof message == "object") {
                    message = JSON.stringify(message);
                }

                var description = "";
                if(version) {
                    description += version +": ";
                }
                description += "from " + event.sourceVIP + ": " + message;

                Log.info(instance, "message-test-handler", description);
                captor.signal(description);
            }
        },

        newConnectionLostPrintCallback: function (captor, instance) {
            return function onConnectionLost(targetVIP) {

                description = "from " + targetVIP + " connection lost";

                Log.info(instance, "connection-lost-handler", description);
                captor.signal(description);
            }
        },

        newHeartbeatPrintCallback: function (captor, instance) {
            return function onHeartbeat(event) {

                description = event.sourceVIP + " heartbeat message";

                Log.info(instance, "connection-lost-handler", description);
                captor.signal(description);
            }
        },

        onHeartbeatPromise: function(reliableEndpoint) {
            Log.debug(reliableEndpoint.vip, "waiting-info", "Waiting for heartbeat");

            return new Promise(function(r) {
                reliableEndpoint.onHeartbeat = r;
            }).then(function(){
                Log.debug(reliableEndpoint.vip, "waiting-info", "Heartbeat triggered");
            });
        },

        newInstance: function (Cls) {
            if(typeof Cls != 'function') throw new Error("Can't apply 'new' operator to non-function argument");

            return new (Function.prototype.bind.apply(Cls, arguments));
        },

        classFactoryMethod: function(Cls) {
            if(typeof Cls != 'function') throw new Error("Can't create class factory function for non-function argument");
            var args = [Cls];
            [].push.apply(args, arguments);

            return VnfTestUtils.newInstance.bind.apply(VnfTestUtils.newInstance, args);
        }
    };

    return VnfTestUtils;
});