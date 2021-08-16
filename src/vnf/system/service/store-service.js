export function StoreService(storeHub) {
    return function(vnfEndpoint) {
        return {"initializeStoreClient": function(){
            return storeHub.connect(vnfEndpoint.eva);
        }}
    }
}
