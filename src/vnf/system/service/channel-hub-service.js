export function ChannelHubService(hub) {
    return function(vnfEndpoint) {
        return {"initializeEndpoint": function(){
            return hub.openEndpoint(vnfEndpoint.vip);
        }}
    }
}
