import {Log} from "../../utils/logger.js";

import {Global}    from "../global.js";
import {ProxyHub}  from "./base/vnf-proxy-hub.js";


export function UnreliableHub(hub) {
    var selfHub = this;

    ProxyHub.call(selfHub, hub);

    var blockedChannels = {};

    selfHub.VnfEndpoint = function UnreliableEndpoint(selfEva) {
        var self = this;
        selfHub.ProxyEndpoint.call(self, selfEva);

        self.parentEndpoint.onMessage = function(event) {
            self.__acceptConnection(event.sourceEva)

            try{
                self.onMessage && self.onMessage({
                    message:   event.message,
                    sourceEva: event.sourceEva,
                    endpoint:   self
                });
            }catch(e) {
                Log.error("unreliable-hub", ["Error in onMessage handler: ", e]);
            }
        }

        self.__doOpenConnection = function(connection) {
            self.parentEndpoint.openConnection(connection.targetEva, function(event) {
                if(event.status  == Global.FAILED) {
                    self.__connectionOpenFailed(connection);
                }else{
                    self.__connectionOpened(connection)
                }
            })
        }

        self.__doSend = function(connection, message) {
            if(blockedChannels[self.eva] && blockedChannels[self.eva][connection.targetEva]) {
                return;
            }

            self.parentEndpoint.send(connection.targetEva, message);
        }

        self.parentEndpoint.onConnectionLost(function(targetEva){
            self.closeConnection(targetEva);
        });
    }

    selfHub.blockChannel = function(fromEva1, toEva2) {
        if(!blockedChannels[fromEva1]){
            blockedChannels[fromEva1] = {};
        }

        blockedChannels[fromEva1][toEva2] = true;
    }

    selfHub.unblockChannel = function(fromEva1, toEva2) {
        if(blockedChannels[fromEva1]){
            blockedChannels[fromEva1][toEva2] = false;
        }
    }
}