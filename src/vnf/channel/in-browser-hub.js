import {Log} from "../../utils/logger.js";

import {VnfHub} from "./base/vnf-hub.js";

export function InBrowserHub(){
    var selfHub = this;

    VnfHub.call(selfHub);

    var immediateSend = false;

    selfHub.setImmediateSend = function(value) {
        immediateSend = value;
    }

    selfHub.VnfEndpoint = function InBrowserEndpoint(selfEva) {
        var self = this;
        selfHub.BaseEndPoint.call(this, selfEva);

        self.__doOpenConnection_NextTry = function(connection) {
            window.setTimeout(function __doOpenConnectionTimerCallback(){
                if(connection.isConnected || connection.isDestroyed) {
                    return;
                }

                var remoteEndpoint = selfHub.getEndPoint(connection.targetEva);

                if(remoteEndpoint) {

                    connection.remoteEndpoint = remoteEndpoint;

                    var remoteConnection = remoteEndpoint.__lazyNewConnection(selfEva);
                    remoteConnection.remoteEndpoint = self;
                    remoteEndpoint.__acceptConnection(selfEva);

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
            var remoteConnection = remoteEndpoint.getConnection(selfEva);

            if(!remoteConnection || remoteConnection.remoteEndpoint != self) return;

            var onMessage = remoteEndpoint.onMessage;

            try{
                onMessage && onMessage({sourceEva: selfEva, message: message, endpoint: remoteEndpoint});
            }catch(e) {
                Log.error(selfEva, "in-browser-message", ["Error in onMessage handler: ", e]);
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
             if(remoteEndpoint && remoteEndpoint.isConnected(selfEva)) {
                window.setTimeout(remoteEndpoint.closeConnection.bind(null, selfEva), 0);
             }
        }
    }
};
