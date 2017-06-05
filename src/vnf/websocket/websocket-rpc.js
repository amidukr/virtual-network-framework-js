define(["utils/logger", "utils/observable", "utils/utils", "vnf/global"],
function(Log, Observable, Utils, Global) {

    return function WebSocketRpc(vip, webSocketFactory) {
        var webSocketRpc = this;
        var webSocket = null;

        var destroyed = false;

        var connectionOpenListeners = new Observable();

        var callMap = {};
        var handlers = {}

        var nextCallId = 0;
        var isConnected = false;

        var busyTimerActive = false;
        var busyTimerGotResponse = false;

        var loginRecreateInterval =   30*1000;
        var busyTimerInterval     =   20*1000;
        var idleTimerInterval     = 5*60*1000;

        var idleTimerToken = null;

        function onBusyTimer() {
            // connection lost verification busy is the case when calls are made constantly to websocket

            // check if at least on call got response
            // if so then web socket connection alive
            busyTimerActive = false;

            if(destroyed) return;

            if(!busyTimerGotResponse) {
                recreateWebSocket();
            }else{
                busyTimerGotResponse = false;                        
                if(!Utils.isEmptyObject(callMap)) {
                    startBusyTimer();
                }else{
                    startIdleTimer();
                }
            }
        }

        function onIdleTimer() {
            idleTimerToken = null;

            if(destroyed) return;

            webSocketRpc.verifyConnection();
        }

        function startBusyTimer() {
            stopIdleTimer();

            if(!busyTimerActive) {
                busyTimerActive = true;
                window.setTimeout(onBusyTimer, busyTimerInterval);
            }
        }

        function stopIdleTimer() {
            if(idleTimerToken) {
                window.clearTimeout(idleTimerToken);
                idleTimerToken = null;
            }
        }

        function startIdleTimer() {
            idleTimerToken = window.setTimeout(onIdleTimer, idleTimerInterval);
        }

        function recreateWebSocket() {
            var previousWebSocket = webSocket;
            webSocket = null;

            try{
                previousWebSocket && previousWebSocket.close();
            }catch(error) {
                Log.warn(vip, "websocket-rtc", [new Error("Unable to close websocket"), error]);
            }

            createWebSocket();
        }

        function createWebSocket() {
            webSocket = webSocketFactory.newWebSocket();

            for(var header in callMap) {
                var callAction = callMap[header];
                if(!callAction.retryResend) {
                    delete callMap[header];

                    callAction.reject(Global.REJECTED_BY_TIMEOUT);
                }
            }

            webSocket.onopen = function() {
                if(destroyed) return;

                webSocketRpc.invoke("LOGIN", vip, {immediateSend: true})
                .then(function(result){
                    if(result.data != "OK") {
                        window.setTimeout(recreateWebSocket, loginRecreateInterval);
                    }

                    isConnected = true;
                    for(var header in callMap) {
                        var callAction = callMap[header];

                        try{
                            webSocket.send(callAction.message);
                        }catch(error) {
                            Log.warn(vip, "websocket-rtc", [new Error("Unable to send message via websocket"), error]);
                        }

                    }

                    connectionOpenListeners.fire();
                });
            }

            webSocket.onmessage = function(event) {
                if(destroyed) return;
                if(event.target != webSocket) return;

                busyTimerGotResponse = true;

                var message = event.data;

                var lineBreakIndex = message.indexOf('\n');

                var header;
                var argument;

                if(lineBreakIndex == -1) {
                    header = message;
                    argument = null;
                }else{
                    var header   = message.substr(0, lineBreakIndex);
                    var argument = message.substr(lineBreakIndex+1);
                }

                try {

                    var handler = handlers[header];
                    handler && handler(header, argument);

                    var callAction = callMap[header];
                    callAction && handleCallResponse(callAction, header, argument);

                    if(!handler && !callAction) {
                        throw new Error("WebSocketRpc: Unexpected message header: '" + header + "'")
                    }

                }catch(error) {
                    Log.error(vip, "websocket-rtc", error);
                }
            }

            webSocket.onclose = function(evt) {
                if(destroyed) return;

                if(evt.target == webSocket) {
                    createWebSocket();
                }
            }
        }

        function handleCallResponse(callAction, header, argument) {
            var callIdBreakIndex = header.indexOf(' ');
            var callId  = header.substr(0, callIdBreakIndex);
            var command = header.substr(callIdBreakIndex + 1);

            delete callMap[header];

            callAction.resolve({
                data:    argument,
                command: command,
                callId:  callId
            });
        }

        this.setBusyTimerInterval = function(value) {
            busyTimerInterval = value;
        }

        this.setIdleTimerInterval = function(value) {
            idleTimerInterval = value;
        }

        this.setLoginRecreateInterval = function(value) {
            loginRecreateInterval = value;
        }

        this.onConnectionOpen = connectionOpenListeners.addListener;

        this.registerPushHandler = function(command, callback) {
            if(destroyed) return;

            handlers[command] = function(header, argument) {
                callback({
                    data: argument,
                    command: header
                })
            }
        }

        this.verifyConnection = function() {
            webSocketRpc.invoke("PING", null, {retryResend: true});
        }

        this.invoke = function(command, valueArgument, callParameters) {
            if(destroyed) {
                return Promise.reject(Global.INSTANCE_DESTROYED);
            }

            startBusyTimer();

            return new Promise(function(resolve, reject){
                var callId = nextCallId++;

                var header = callId + " " + command;

                var message;
                if(valueArgument === null | valueArgument === undefined) {
                    message = header;
                }else{
                    message = header + "\n" + valueArgument;
                }

                callMap[header] = {
                    message: message,
                    resolve: resolve,
                    reject:  reject,
                    retryResend: callParameters && callParameters.retryResend
                }

                var immediateSend = callParameters && callParameters.immediateSend;

                if(isConnected || immediateSend) {

                    try{
                        webSocket.send(message);
                    }catch(error) {
                        Log.warn(vip, "websocket-rtc", [new Error("Unable to send message via websocket"), error]);
                    }
                }
            });

        }

        this.destroy = function() {
            if(destroyed) return;

            destroyed = true;

            try{
                webSocket.close();
            }catch(error) {
                Log.warn(vip, "websocket-rtc", [new Error("Unable to close websocket"), error]);
            }

            stopIdleTimer();

            for(var header in callMap) {
                var callAction = callMap[header];
                delete callMap[header];
                callAction.reject(Global.INSTANCE_DESTROYED);
            }
        }

        webSocketRpc.registerPushHandler("CALL_ERROR", function(event) {
            var message = event.data;
            var lineBreakIndex = message.indexOf("\n");

            var header   = message.substr(0, lineBreakIndex);
            var errorCode = message.substr(lineBreakIndex+1);

            callAction = callMap[header];

            delete callMap[header];

            callAction.reject(errorCode);
        })

        createWebSocket();
    }
});
