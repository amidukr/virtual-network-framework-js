define([], function() {

    return function StoreService(storeHub) {
        return function(vnfEndpoint) {
            return {"initializeStoreClient": function(){
                return storeHub.connect(vnfEndpoint.vip);
            }}
        }
    }
})
