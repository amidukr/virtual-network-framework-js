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

        self.__doOpenConnection_NextTry = function(connection) {
            window.setTimeout(function __doOpenConnectionTimerCallback(){
                if(connection.isConnected || connection.isDestroyed) {
                    return;
                }

                var remoteEndpoint = selfHub.getEndPoint(connection.targetVip);

                if(remoteEndpoint) {

                    connection.remoteEndpoint = remoteEndpoint;

                    var remoteConnection = remoteEndpoint.__lazyNewConnection(selfVip);
                    remoteConnection.remoteEndpoint = self;
                    remoteEndpoint.__acceptConnection(selfVip);

                    self.__connectionOpened(connection);
                }else{
                    self.__connectionNextTryFailed(connection);
                }
            }, 0);
        }

        function sendFunction(connection, message) {
            var remoteEndpoint = connection.remoteEndpoint;

            if(!remoteEndpoint)  return;
            if(remoteEndpoint.isDestroyed()) return;
            var remoteConnection = remoteEndpoint.getConnection(selfVip);

            if(!remoteConnection || remoteConnection.remoteEndpoint != self) return;

            var onMessage = remoteEndpoint.onMessage;

            try{
                onMessage && onMessage({sourceVip: selfVip, message: message, endpoint: remoteEndpoint});
            }catch(e) {
                Log.error(selfVip, "in-browser-message", ["Error in onMessage handler: ", e]);
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
