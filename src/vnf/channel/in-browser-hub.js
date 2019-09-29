import {Log} from "../../utils/logger.js";

import {VnfHub} from "./base/vnf-hub.js";

export function InBrowserHub(){
    var selfHub = this;

    VnfHub.call(selfHub);

    var immediateSend = false;

    selfHub.setImmediateSend = function(value) {
        immediateSend = value;
    }

    selfHub.VnfEndpoint = function InBrowserEndpoint(selfVip) {
        var self = this;
        selfHub.BaseEndPoint.call(this, selfVip);

        self.__doOpenConnection = function(connection) {
            window.setTimeout(function(){
                var remoteEndpoint = selfHub.getEndPoint(connection.targetVip);

                if(remoteEndpoint) {

                    connection.remoteEndpoint = remoteEndpoint;

                    var remoteConnection = remoteEndpoint.__lazyNewConnection(selfVip);
                    remoteConnection.remoteEndpoint = self;
                    remoteEndpoint.__connectionOpened(selfVip);

                    self.__connectionOpened(connection.targetVip);
                }else{
                    self.__connectionOpenFailed(connection.targetVip);
                }
            }, 0);

        }

        function sendFunction(connection, message) {
            var remoteEndpoint = connection.remoteEndpoint;

            if(!remoteEndpoint)  return;
            if(remoteEndpoint.isDestroyed()) return;
            if(remoteEndpoint.getConnection(selfVip).remoteEndpoint != self) return;

            var onMessage = remoteEndpoint.onMessage;


            if(onMessage) {
                onMessage({sourceVip: selfVip, message: message, endpoint: remoteEndpoint});
            }
        }

        self.__doSend = function(connection, message) {
            if(immediateSend) {
                sendFunction(connection, message);
            }else{
                window.setTimeout(sendFunction.bind(null, connection, message), 0);
            }
        }

        self.__doReleaseConnection = function(connection) {
             var remoteEndpoint = connection.remoteEndpoint;
             if(remoteEndpoint && remoteEndpoint.isConnected(selfVip)) {
                window.setTimeout(remoteEndpoint.closeConnection.bind(null, selfVip), 0);
             }
        }
    }
};
