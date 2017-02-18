define(["vnf/vnf", "utils/logger"], function(VNF, Log){
    var VNFTestUtils = {

        test: function(description, args, callback) {
            QUnit.test(description, function(assert){
                Log.info("test", description);

                if(callback == undefined) {
                    callback = args;
                    args = {};
                }

                callback(assert, args);
            });
        },

        vnfTest: function(description, argumentProcessor, callback) {

            if(callback == undefined) {
                callback = argumentProcessor;
                argumentProcessor = {};
            }

            var inMemoryFactory = function() {return new VNF.InBrowserHub();};
            var rtcHubFactory   = function() {return new VNF.RTCHub(new VNF.InBrowserHub());};

            var proxyCallback = function proxyCallback(assert, args) {
                callback(assert, Object.assign({}, argumentProcessor(args), args));
            };

            VNFTestUtils.test("[root:InMemory]-" + description, {rootHubFactory: inMemoryFactory}, proxyCallback);
            VNFTestUtils.test("[root:RTC]-"      + description, {rootHubFactory: rtcHubFactory}  , proxyCallback);
        },

        newPrintCallback: function (instance, version) {
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

            return VNFTestUtils.newInstance.bind.apply(VNFTestUtils.newInstance, args);
        }
    };

    return VNFTestUtils;
});