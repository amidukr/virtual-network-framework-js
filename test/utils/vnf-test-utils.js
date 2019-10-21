import {Observable} from "../../src/utils/observable.js";
import {Log}        from "../../src/utils/logger.js";

import {Vnf} from "../../src/vnf/vnf.js";

var runningTest = "";
var tearDownListeners = new Observable();

function doTearDown(details) {
    tearDownListeners.fire(details);
    tearDownListeners = new Observable();
}

var counter = 1;

QUnit.testDone( function(details) {
    doTearDown(details);
});

QUnit.moduleDone(function(details){
    doTearDown(details);
})

QUnit.done(function(details){
    doTearDown(details);
})

var VnfTestUtils = {

    onTearDown: function(callback) {
         tearDownListeners.addListener(callback);
    },

    test: function(testProfile, shortDescription, args, callback) {
        var profileKey = [];
        var profileKeyDescription;

        if(testProfile.constructor === Array) {
            var profileKey = [];
            profileKeyDescription = "";

            for(var i = 0; i < testProfile.length; i++) {
                if(i != 0) {
                    profileKeyDescription += ", ";
                }
                profileKeyDescription += testProfile[i];

                profileKey.splice(0, 0, profileKeyDescription);
            }
        }else if(typeof testProfile == "string") {
            profileKeyDescription = testProfile;
            profileKey.splice(0, 0, profileKeyDescription);
        }else{
            throw new Error("testProfile argument unexpected type: " + testProfile);
        }


        var description = "["+profileKeyDescription+"] " + shortDescription;

        profileKey.splice(0, 0, description);

        QUnit.test(description, function(assert){
            Log.info("test", description);
            var previousTest = runningTest;
            runningTest = description;

            var parameter = {};

            // testDone wasn't executed couple time due to timeouts,
            // but resource still have to be cleared
            doTearDown();

            VnfTestUtils.onTearDown(function(details){

                if(window.vnfActiveEndpoints.length > 0) {
                    var testName = details && details.name;

                    var vnfActiveEndpointNames = window.vnfActiveEndpoints.map(x => `${x.constructor.name}(${x.vip})`);

                    Log.warn("test", [
                        `Active endpoints left, testName: ${testName}` +
                        `, previousTest: ${previousTest}` +
                        `, active endpoints:  [${vnfActiveEndpointNames}]`
                    ]);

                    var vnfActiveEndpointsClone = window.vnfActiveEndpoints.slice();
                    for(var i = 0; i < vnfActiveEndpointsClone.length; i++) {
                        try{
                            vnfActiveEndpointsClone[i].destroy();
                        }catch(e) {
                            Log.debug("test", ["Exception during endpoint destroy: ", e]);
                        }
                    }
                }
            });

            parameter = Object.assign(parameter, {testProfile: testProfile,
                                                  testDescription: description,
                                                  profileKey:  profileKey})

            //QUnit defect fix
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

            if(typeof args == 'function') {
                args = args(assert, parameter);
            }

            parameter = Object.assign(parameter, args);



            return callback(assert, parameter);
        });
    },

    vnfTest: function(argument) {

        var description = argument.description;
        var argumentProcessor = argument.argumentProcessor;
        var callback = argument.callback;

        if(argumentProcessor == undefined) {
            argumentProcessor = function(value){return value;};
        }

        function inMemoryFactory() {return new Vnf.InBrowserHub();};
        function rtcHubFactory() {return new Vnf.RtcHub(new Vnf.InBrowserHub());};

        function reliableRtcHubFactory() {
            var reliableRtc = new Vnf.ReliableRtcHub(new Vnf.InBrowserHub());

            reliableRtc.setHeartbeatInterval(50);
            reliableRtc.setConnectionInvalidateInterval(500);
            reliableRtc.setConnectionLostTimeout(5000);

            return reliableRtc;
        };

        function reliableHubFactory() {
            var reliableRtc = new Vnf.ReliableHub(new Vnf.InBrowserHub());

            reliableRtc.setHeartbeatInterval(50);
            reliableRtc.setConnectionInvalidateInterval(500);
            reliableRtc.setConnectionLostTimeout(5000);

            return reliableRtc;
        };

        var proxyCallback = function proxyCallback(assert, args) {
            return callback(assert, Object.assign({}, argumentProcessor(assert, args), args));
        };

        function generateProfileKey(rootHub) {
            if(argument.profileKey == undefined) {
                return rootHub;
            }else{
                return [rootHub, argument.profileKey];
            }
        }

        VnfTestUtils.test(generateProfileKey("root:InMemory"),    description, {rootHubFactory: inMemoryFactory},       proxyCallback);
        VnfTestUtils.test(generateProfileKey("root:Rtc"),         description, {rootHubFactory: rtcHubFactory},         proxyCallback);
        VnfTestUtils.test(generateProfileKey("root:Reliable"),    description, {rootHubFactory: reliableHubFactory},    proxyCallback);
        VnfTestUtils.test(generateProfileKey("root:ReliableRtc"), description, {rootHubFactory: reliableRtcHubFactory}, proxyCallback);
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
            description += "from " + event.sourceVip + ": " + message;

            Log.verbose(instance, "message-test-handler", description);
            captor.signal(description);
        }
    },

    newConnectionLostPrintCallback: function (captor, instance) {
        return function onConnectionLost(targetVip) {

            var description = "from " + targetVip + " connection lost";

            Log.verbose(instance, "connection-lost-handler", description);
            captor.signal(description);
        }
    },

    newHeartbeatPrintCallback: function (captor, instance) {
        return function onHeartbeat(event) {

            var description = event.sourceVip + " heartbeat message";

            Log.verbose(instance, "connection-lost-handler", description);
            captor.signal(description);
        }
    },

    onHeartbeatPromise: function(reliableEndpoint) {
        Log.verbose(reliableEndpoint.vip, "waiting-info", "Waiting for heartbeat");

        return new Promise(function(r) {
            reliableEndpoint.onHeartbeat = r;
        }).then(function(){
            Log.verbose(reliableEndpoint.vip, "waiting-info", "Heartbeat triggered");
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

export {VnfTestUtils};
