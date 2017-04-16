define([], function() {

    return function VNFCoreService() {
        return function(vnfEndpoint) {
            var parentEndpoint;

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

                    var parentEndpoint = vnfEndpoint.serviceLookupCallSingle("initializeEndpoint");
                    var storeClient    = vnfEndpoint.serviceLookupCallSingle("initializeStoreClient");

                    vnfEndpoint.send = parentEndpoint.send;
                    parentEndpoint.onMessage = onMessage;

                    vnfEndpoint.getStoreClient = function() {
                        storeClient;
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