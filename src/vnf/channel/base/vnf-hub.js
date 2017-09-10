define(["utils/logger", "utils/observable", "vnf/global"], function(Log, Observable, Global) {

    window.vnfActiveEndpoints = [];
    
    return function VnfHub(){
        var self = this;
        
        var hub = {};
        
        self.BaseEndPoint = function BaseEndPoint(selfVip) {
            var self = this;
            var destroyListeners = new Observable();
            var connectionLostListeners = new Observable();
            
            var connections = {}
            
            window.vnfActiveEndpoints.push(self);
            
            self.vip = selfVip;
            
            self.onMessage = null;
            var destroyed = false;
            
            function notifyConnectionSuccess(targetVip, callback) {
                callback({
                    status: Global.CONNECTED,
                    targetVip: targetVip,
                    endpoint: self
                });
            }

            function notifyConnectionFailed(targetVip, callback) {
                callback({
                    status: Global.FAILED,
                    targetVip: targetVip,
                    endpoint: self
                });
            }
            
            self.isConnected = function isConnected(targetVip) {
                var connection = connections[targetVip];
                return connection != null && connection.isConnected;
            }

            self.__lazyNewConnection = function(targetVip) {
                var connection = connections[targetVip];
                if(!connection) {
                    connection = {isConnected: false,
                                  targetVip: targetVip};
                    connections[targetVip] = connection;
                }

                return connection;
            }
            

            
            self.__connectionOpened = function(targetVip) {
                var connection = self.__lazyNewConnection(targetVip);

                if(connection.isConnected) {
                    return;
                }

                connection.isConnected = true;

                var callback = connection.callback;
                connection.callback = null;
                if(callback) {
                    notifyConnectionSuccess(targetVip, callback);
                }
            }

            self.__connectionOpenFailed = function(targetVip) {
                var connection = connections[targetVip];
                if(!connection) {
                    return;
                }

                if(connection.isConnected) {
                    throw new Error("Wrong state, connection is already established.");
                }

                self.closeConnection(targetVip);
            }

            self.openConnection = function openConnection(targetVip, callback) {
                if(typeof targetVip != "string")   throw new Error("Wrong first argument type, targetVip as string is expected");
                if(typeof callback  != "function") throw new Error("Wrong second argument type, callback as function is expected");

                if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

                if(self.isConnected(targetVip)) {
                    notifyConnectionSuccess(targetVip, callback);
                    return;
                }

                var connection = self.__lazyNewConnection(targetVip);
                connection.callback = callback;

                self.__doOpenConnection(connection);
            }

            self.send = function(targetVip, message) {
                if(typeof targetVip != "string")   throw new Error("Wrong first argument type, targetVip as string is expected");

                if(self.isDestroyed()) throw new Error("Endpoint is destroyed");

                var connection = connections[targetVip];
                if(!connection && !connection.isConnected) {
                    throw new Error("Connection to endpoint '" + targetVip + "' isn't established");
                }

                self.__doSend(connection, message);
            }


            self.closeConnection = function(targetVip) {
                if(typeof targetVip != "string")   throw new Error("Wrong first argument type, targetVip as string is expected");

                var connection = connections[targetVip];
                if(!connection) {
                    return;
                }

                delete connections[targetVip];

                var onConnectionClose = self.__onConnectionClose;
                if(onConnectionClose) {
                    onConnectionClose(connection);
                }

                if(connection.isConnected) {
                    connection.isConnected = false;
                    connectionLostListeners.fire(targetVip);
                }else{
                    var callback = connection.callback;
                    connection.callback = null;
                    if(callback) {
                        notifyConnectionFailed(targetVip, callback);
                    }
                }
            }
            
            self.isDestroyed = function() {
                return destroyed;
            }
            
            self.onDestroy = destroyListeners.addListener;
            
            self.onConnectionLost = connectionLostListeners.addListener;
            //TODO: replace to __connectionClosed self.__fireConnectionLost = connectionLostListeners.fire;
            
            self.destroy = function() {
                if(destroyed) return;
                destroyed = true;

                for(var targetVip in connections){
                    try{
                        self.closeConnection(targetVip);
                    }catch(e){
                        Log.error(selfVip, "in-browser-hub", ["Error closing connection", e]);
                    }
                }

                delete hub[selfVip];

                destroyListeners.fire();

                window.vnfActiveEndpoints.removeValue(self);
            }
        }
        
        self.getEndPoint = function(vip) {
           return hub[vip];
        }
        
        self.openEndpoint = function openEndpoint(vip) {
           var endpoint = hub[vip];
           if(!endpoint) {
                endpoint = new self.VnfEndpoint(vip);
                hub[vip] = endpoint;
           }
        
           return endpoint;
        }
    };
});