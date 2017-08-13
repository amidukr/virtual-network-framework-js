define([],
function() {
    return function WebSocketFactory(url) {
        this.newWebSocket = function() {
            return new WebSocket(url);
        }
    }
});