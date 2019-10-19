import {Log} from "../../../utils/logger.js";

import {VnfHub} from "./vnf-hub.js";

export function ProxyHub(parentHub){
    var selfHub = this;

    if(!parentHub) {
        throw new Error("Unable to create instnce of ProxyHub, argument 'parentHub' shouldn't be null");
    }

    VnfHub.call(selfHub);

    selfHub.ProxyEndpoint = function ProxyEndpoint(selfVip) {
        var self = this;
        selfHub.BaseEndPoint.call(this, selfVip);

        self.parentEndpoint = parentHub.openEndpoint(selfVip);

        self.onDestroy(function selfOnDestroyCallback(){
            if(self.parentEndpoint) {
                self.parentEndpoint.destroy();
            }
        });

        self.__doReleaseConnection = function(connection) {
            if(self.parentEndpoint) {
                self.parentEndpoint.closeConnection(connection.targetVip);
            }
        };
    }
};