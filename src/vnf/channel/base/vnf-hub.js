import {Log}        from "../../../utils/logger.js";
import {Observable} from "../../../utils/observable.js";

import {Global} from "../../global.js";


window.vnfActiveEndpoints = [];
    
export function VnfHub(){
    var selfHub = this;

    var hub = {};

    var openConnectionRetries = 3;
    var retryConnectAfterDelay = 0;
    var establishConnectionTimeout = 5000;

    selfHub.setEstablishConnectionTimeout = function(value) {
        establishConnectionTimeout = value;
    }

    selfHub.setRetryConnectAfterDelay = function(value) {
        retryConnectAfterDelay = value;
    }

    selfHub.setOpenConnectionRetries = function(value) {
        openConnectionRetries = value;
    }

    selfHub.BaseEndPoint = function BaseEndPoint(selfVip) {
        var self = this;
        var destroyListeners = new Observable();
        var connectionOpenListeners = new Observable();
        var connectionLostListeners = new Observable();

        var connections = {}
        var connectionsArray = null;

        var anyTypeSupported = false;

        window.vnfActiveEndpoints.push(self);

        self.vip = selfVip;

        self.onMessage = null;
        var destroyed = false;

        function notifyConnectionSuccess(targetVip, callback) {
            try{
                callback({
                    status: Global.CONNECTED,
                    targetVip: targetVip,
                    endpoint: self
                });
            }catch(e) {
                Log.error(selfVip, ["vnf-hub", "Error in connection callback\n", e]);
            }
        }

        function notifyConnectionFailed(targetVip, callback) {
            try{
                callback({
                    status: Global.FAILED,
                    targetVip: targetVip,
                    endpoint: self
                });
            }catch(e) {
                Log.error(selfVip, ["vnf-hub", "Error in connection callback\n", e]);
            }
        }

        function destroyConnection(connection) {
            if(connection.isDestroyed) return;
            connection.isDestroyed = true;

            if(connections[connection.targetVip] == connection) {
                delete connections[connection.targetVip];
                connectionsArray = null;

                var __doReleaseConnection = self.__doReleaseConnection;
                if(__doReleaseConnection) {
                    __doReleaseConnection(connection);
                }

                if(connection.isConnected) {
                    connectionLostListeners.fire(connection.targetVip);
                }
            }

            if(!connection.isConnected && connection.callback) {
                notifyConnectionFailed(connection.targetVip, connection.callback);
                connection.callback = null;
            }

            connection.isConnected = false;
        }

        self.setAnyTypeSupported = function(value) {
            anyTypeSupported = value;
        }

        self.isConnected = function isConnected(targetVip) {
            var connection = connections[targetVip];
            return connection != null && connection.isConnected;
        }

        self.getConnections = function() {
            if(connectionsArray == null) {
                connectionsArray = [];
                for(var vip in connections) {
                    connectionsArray.push(connections[vip]);
                }
            }

            return connectionsArray;
        }

        self.getConnection = function(targetVip) {
            return connections[targetVip];
        }

        self.__lazyNewConnection = function(targetVip) {
            var connection = connections[targetVip];
            if(!connection) {
                connection = {isConnected: false,
                              destroyed: false,
                              openConnectionRetriesLeft: 0,
                              targetVip: targetVip};
                connections[targetVip] = connection;

                connectionsArray = null;
            }

            return connection;
        }

        self.__acceptConnection = function(targetVip) {
            var connection = self.__lazyNewConnection(targetVip);

            if(connection.isDestroyed || connection.isConnected) {
                return;
            }

            self.__connectionOpened(connection);
        }

        self.__connectionOpened = function(connection) {

            if(connection.isDestroyed || connection.isConnected) {
                return;
            }

            connection.isConnected = true;

            connectionOpenListeners.fire(connection.targetVip);

            var callback = connection.callback;
            connection.callback = null;
            if(callback) {
                notifyConnectionSuccess(connection.targetVip, callback);
            }
        }

        self.__connectionOpenFailed = function(connection) {
            if(connection.isDestroyed) {
                return;
            }

            if(connection.isConnected) {
                throw new Error("Wrong state, connection is already established.");
            }

            destroyConnection(connection);
        }

        self.__connectionNextTryFailed = function(connection) {
            if(connection.retryTimeoutToken) {
                window.clearTimeout(connection.retryTimeoutToken);
                connection.retryTimeoutToken = null;
            }

            if(connection.isConnected || connection.isDestroyed) {
                return;
            }

            if(connection.openConnectionRetriesLeft-- > 0) {
                if(self.__doOpenConnection_CleanBeforeNextTry) self.__doOpenConnection_CleanBeforeNextTry(connection);
                window.setTimeout(self.__doOpenConnectionRetryLoop.bind(null, connection), retryConnectAfterDelay);
            }else{
                self.__connectionOpenFailed(connection);
            }
        }

        self.__rejectConnection = function(connection) {
            if(connection.isDestroyed) {
                return;
            }

            if(connection.isConnected) {
                self.closeConnection(connection.targetVip);
            }else{
                self.__connectionNextTryFailed(connection);
            }
        }

        self.__doOpenConnectionRetryLoop = function __doOpenConnectionRetryLoop(connection) {
            if(connection.isConnected || connection.isDestroyed) {
                return;
            }

            if(self.__doOpenConnection_NextTry) self.__doOpenConnection_NextTry(connection);
            connection.retryTimeoutToken = window.setTimeout(self.__connectionNextTryFailed.bind(self, connection), establishConnectionTimeout);
        }

        self.openConnection = function openConnection(targetVip, callback) {
            if(typeof targetVip != "string")   throw new Error("Wrong first argument type, targetVip as string is expected");
            if(typeof callback  != "function") throw new Error("Wrong second argument type, callback as function is expected");

            if(self.isDestroyed()) {
                throw new Error("Endpoint is destroyed");
            }

            if(self.isConnected(targetVip)) {
                notifyConnectionSuccess(targetVip, callback);
                return;
            }

            var isNewConnection = connections[targetVip] == null;
            var connection = self.__lazyNewConnection(targetVip);
            connection.callback = callback;

            if(isNewConnection) {
                if(targetVip == selfVip) {
                    window.setTimeout(self.__connectionOpened.bind(null, connection), 0)
                }else{
                    connection.openConnectionRetriesLeft = openConnectionRetries;
                    if(self.__doOpenConnection) self.__doOpenConnection(connection);
                    self.__doOpenConnectionRetryLoop(connection);
                }
            }
        }

        self.send = function(targetVip, message) {
            if(typeof targetVip != "string")
                throw new Error("Wrong first argument type, targetVip as string is expected");
            if(!anyTypeSupported && typeof message   != "string")
                throw new Error("Wrong second argument type, message - only string is supported");

            if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

            var connection = connections[targetVip];
            if(!connection || !connection.isConnected) {
                throw new Error("Connection to endpoint '" + targetVip + "' isn't established");
            }

            if(targetVip == selfVip) {
                window.setTimeout(function(){
                    try{
                        self.onMessage && self.onMessage({sourceVip: selfVip, message: message, endpoint: self});
                    }catch(e) {
                        Log.error("vnf-hub", ["Error in onMessage handler: ", e]);
                    }

                }, 0);
            }else{
                self.__doSend(connection, message);
            }
        }


        self.closeConnection = function(targetVip) {
            if(typeof targetVip != "string")   throw new Error("Wrong first argument type, targetVip as string is expected");

            var connection = connections[targetVip];
            if(!connection) {
                return;
            }

            destroyConnection(connection);
        }

        self.isDestroyed = function() {
            return destroyed;
        }

        self.onDestroy = destroyListeners.addListener;

        self.onConnectionOpen = connectionOpenListeners.addListener;
        self.onConnectionLost = connectionLostListeners.addListener;

        self.destroy = function() {
            if(destroyed) return;
            destroyed = true;

            for(var targetVip in connections){
                try{
                    self.closeConnection(targetVip);
                }catch(e){
                    Log.error(selfVip, "vnf-hub", ["Error closing connection", e]);
                }
            }

            delete hub[selfVip];

            destroyListeners.fire();

            window.vnfActiveEndpoints.removeValue(self);
        }
    }

    selfHub.getEndPoint = function(vip) {
       return hub[vip];
    }

    selfHub.openEndpoint = function openEndpoint(vip) {
       var endpoint = hub[vip];
       if(!endpoint) {
            endpoint = new selfHub.VnfEndpoint(vip);
            hub[vip] = endpoint;
       }

       return endpoint;
    }
};
