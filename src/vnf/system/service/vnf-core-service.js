define([], function() {

    return function VNFCoreService() {
        return function(vnfEndpoint) {
            var parentEndpoint;
            var storeClient;

            var handlersRegistry = {}

            function onMessage(event) {
                var handler = handlersRegistry[event.message.type];
                handler && handler(event);
            }

            return {
                initialize: function() {
                    var messageHandlers = vnfEndpoint.serviceLookupCall("messageHandlers");
                    for(var i = 0; i < messageHandlers.length; i++) {
                        var messageHandler = messageHandlers[i];
                        for(var messageType in messageHandler) {
                            handlersRegistry[messageType] = messageHandler[messageType];
                        }
                    }

                    parentEndpoint = vnfEndpoint.serviceLookupCallSingle("initializeEndpoint");
                    storeClient    = vnfEndpoint.serviceLookupCallSingle("initializeStoreClient");

                    vnfEndpoint.send = parentEndpoint.send;
                    vnfEndpoint.closeConnection = parentEndpoint.closeConnection;
                    parentEndpoint.onMessage = onMessage;

                    vnfEndpoint.getStoreClient = function() {
                        return storeClient;
                    }

                    parentEndpoint.onConnectionLost(function(targetVip){
                        vnfEndpoint.serviceLookupCall("onConnectionLost", targetVip)
                    });
                },

                destroy: function() {
                    parentEndpoint.destroy();
                    storeClient.destroy();
                }
            }
        }
    }
})