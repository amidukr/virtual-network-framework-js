import {Log}  from "../../utils/logger.js";

import {Global}  from "../global.js";

import {VnfCoreService}     from "./service/vnf-core-service.js";
import {ServiceCallService} from "./service/service-call-service.js";
import {ChannelHubService}  from "./service/channel-hub-service.js";
import {StoreService}       from "./service/store-service.js";

export function VnfSystem() {
    var vnfSystem = this;

    var endpoints = {}
    var serviceFactories = [];

    function VnfSystemEndpoint(eva) {
        var vnfEndpoint = this;
        vnfEndpoint.eva = eva;

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
                    Log.error(eva, "VnfSystem", ["Service lookup call failed", e]);
                }
            }

            return result;
        }

        this.destroy = function() {
            vnfEndpoint.serviceLookupCall("destroy");
            delete endpoints[eva];
        }

        this.serviceLookupCall("initialize");
    }

    this.registerService = function(serviceFactory) {
        if(!serviceFactory) throw new Error("registerService(undefined) called");

        serviceFactories.push(serviceFactory);
    }

    this.openEndpoint = function(eva) {
        var endpoint = endpoints[eva];
        if(!endpoint) {
            endpoint = new VnfSystemEndpoint(eva);
            endpoints[eva] = endpoint;
        }
        return endpoint;
    }

    this.registerService(new VnfCoreService())
    this.registerService(new ServiceCallService())
}

VnfSystem.ChannelHubService = ChannelHubService;
VnfSystem.StoreService      = StoreService;

