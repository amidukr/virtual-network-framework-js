define(["vnf/global",
        "utils/logger",
        "vnf/system/service/vnf-core-service",
        "vnf/system/service/service-call-service",
        "vnf/system/service/channel-hub-service",
        "vnf/system/service/store-service"],

        function(Global,
        Log,

        VNFCoreService,
        ServiceCallService,

        ChannelHubService,
        StoreService) {


    function VNFSystem() {
        var vnfSystem = this;

        var endpoints = {}
        var serviceFactories = [];

        function VNFSystemEndpoint(vip) {
            var vnfEndpoint = this;
            vnfEndpoint.vip = vip;

            var serviceList = [];

            for(var i = 0; i < serviceFactories.length; i++) {
                var factoryMethod = serviceFactories[i];
                serviceList.push(new factoryMethod(vnfEndpoint));
            }

            this.serviceLookupCallSingle = function(method, argument) {
                var result = vnfEndpoint.serviceLookupCall(method, argument);
                if(result.length != 1) {
                    throw new Error("Service lookup single result excepted while " + result.length + " found, method: " + method)
                }

                return result[0];
            }

            this.serviceLookupCall = function(method, argument) {
                var result = [];
                for(var i = 0; i < serviceList.length; i++) {
                    try{
                        var value = serviceList[i][method];
                        if(value) {
                            if(typeof value == "function") {
                                result.push(value(argument))
                            }else{
                                result.push(value)
                            }
                        }
                    }catch(e) {
                        Log.error(vip, "VNFSystem", ["Service lookup call failed", e]);
                    }
                }

                return result;
            }

            this.destroy = function() {
                serviceLookupCall("destroy");
                delete endpoints[vip];
            }

            this.serviceLookupCall("initialize");
        }

        this.registerService = function(serviceFactory) {
            if(!serviceFactory) throw new Error("registerService(undefined) called");

            serviceFactories.push(serviceFactory);
        }

        this.openEndpoint = function(vip) {
            var endpoint = endpoints[vip];
            if(!endpoint) {
                endpoint = new VNFSystemEndpoint(vip);
                endpoints[vip] = endpoint;
            }
            return endpoint;
        }

        this.registerService(new VNFCoreService())
        this.registerService(new ServiceCallService())
    }

    VNFSystem.ChannelHubService = ChannelHubService;
    VNFSystem.StoreService      = StoreService;

    return VNFSystem;
})