import {SignalCaptor} from "../../../src/utils/signal-captor.js";
import {webSocketProxyTypeFactory} from "../replay-proxy.js";


function MockWebSocket(assert, captor) {
    var mockWebSocket = this;
    var exceptionOnCall = false;

    this.setExceptionOnCall = function(value) {
        exceptionOnCall = value;
    }

    this.send = function(data) {
        captor.signal("message: " + data);
        if(exceptionOnCall) {
            throw Error(exceptionOnCall);
        }
    }

    this.close = function() {
        captor.signal("close");

        if(exceptionOnCall) {
            throw Error(exceptionOnCall);
        }

        mockWebSocket.setExceptionOnCall("Web socket is in destroyed state");
    }

    this.fireOnopen = function(){
       mockWebSocket.onopen && mockWebSocket.onopen();
    }

    this.fireOnclose = function(){
       mockWebSocket.onclose && mockWebSocket.onclose({target: mockWebSocket});
    }

    this.fireOnmessage = function(message) {
        mockWebSocket.onmessage && mockWebSocket.onmessage({
            data: message,
            target: mockWebSocket
        });
    }

    this.getCaptor = function(){
       return captor;
    }
}

export function MockWebSocketFactory(assert) {
    var mockWebSocket = null;
    var captor = new SignalCaptor(assert);
    var exceptionOnCall = false;

    this.newWebSocket = function(){
        mockWebSocket = new MockWebSocket(assert, captor);

        var proxyWebSocketType = webSocketProxyTypeFactory(function() {  return mockWebSocket;});

        mockWebSocket.setExceptionOnCall(exceptionOnCall)

        captor.signal("new-websocket");

        return new proxyWebSocketType("wss://");
    }

    function proxyCall(functionName) {
        return function() {
            mockWebSocket[functionName].apply(mockWebSocket, arguments);
        }
    }

    this.getMockWebSocket = function() {
        return mockWebSocket;
    }

    this.setExceptionOnCall = function(value) {
        exceptionOnCall = value;
        mockWebSocket && mockWebSocket.setExceptionOnCall(value);
    }

    this.fireOnopen    = proxyCall("fireOnopen");
    this.fireOnclose   = proxyCall("fireOnclose");
    this.fireOnmessage = proxyCall("fireOnmessage");

    this.captor        = captor;
}
