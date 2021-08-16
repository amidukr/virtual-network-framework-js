import {Log} from "../../../utils/logger.js";

import {VnfHub} from "./vnf-hub.js";

export function ProxyHub(parentHub){
    var selfHub = this;

    if(!parentHub) {
        throw new Error("Unable to create instnce of ProxyHub, argument 'parentHub' shouldn't be null");
    }

    VnfHub.call(selfHub);

    selfHub.setEstablishConnectionTimeout = function(value) {
        parentHub.setEstablishConnectionTimeout(value);
    }

    selfHub.setRetryConnectAfterDelay = function(value) {
        parentHub.setRetryConnectAfterDelay(value);
    }

    selfHub.setOpenConnectionRetries = function(value) {
        parentHub.setOpenConnectionRetries(value);
    }

    selfHub.ProxyEndpoint = function ProxyEndpoint(selfEva) {
        var self = this;
        selfHub.BaseEndPoint.call(this, selfEva);

        self.parentEndpoint = parentHub.openEndpoint(selfEva);

        self.onDestroy(function selfOnDestroyCallback(){
            if(self.parentEndpoint) {
                self.parentEndpoint.destroy();
            }
        });

        self.__doReleaseConnection = function(connection) {
            if(self.parentEndpoint) {
                self.parentEndpoint.closeConnection(connection.targetEva);
            }
        };
    }
};