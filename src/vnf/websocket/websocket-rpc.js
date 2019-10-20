import {Log}        from "../../utils/logger.js";
import {Observable} from "../../utils/observable.js";
import {Utils}      from "../../utils/utils.js";

import {Global} from "../global.js";

export function WebSocketRpc(vip, webSocketFactory) {
    var webSocketRpc = this;
    var webSocket = null;

    var destroyed = false;

    var connectionOpenListeners = new Observable();

    var callMap = {};
    var handlers = {}

    var nextCallId = 0;
    var isConnected = false;

    var busyTimerGotResponse = false;

    var loginRecreateInterval =   30*1000;
    var busyTimerInterval     =   20*1000;
    var idleTimerInterval     = 5*60*1000;

    var busyTimerToken = null;
    var loginRecreateTimerToken = null;
    var idleTimerToken = null;

    var allocatedUsagesCounter = 0;

    function onBusyTimer() {
        // connection lost verification busy is the case when calls are made constantly to websocket

        // check if at least on call got response
        // if so then web socket connection alive
        busyTimerToken = null;

        if(destroyed || !isConnected) return;

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

        if(destroyed || !isConnected) return;

        webSocketRpc.verifyConnection();
    }

    function onLoginRecreationTimer() {
        loginRecreateTimerToken = null;

        if(destroyed || isConnected) return;

        recreateWebSocket();
    }


    function stopAllTimers(){
        if(idleTimerToken) {
            window.clearTimeout(idleTimerToken);
            idleTimerToken = null;
        }

         if(loginRecreateTimerToken) {
            window.clearTimeout(loginRecreateTimerToken);
            loginRecreateTimerToken = null;
        }

        if(busyTimerToken) {
            window.clearTimeout(busyTimerToken);
            busyTimerToken = null;
        }
    }

    function startBusyTimer() {
        stopAllTimers();

        busyTimerToken = window.setTimeout(onBusyTimer, busyTimerInterval);
    }

    function startIdleTimer() {
        stopAllTimers();
        idleTimerToken = window.setTimeout(onIdleTimer, idleTimerInterval);
    }


    function startLoginRecreateTimer() {
        stopAllTimers();
        loginRecreateTimerToken = window.setTimeout(onLoginRecreationTimer, loginRecreateInterval);
    }

    function closeWebSocket() {
        var previousWebSocket = webSocket;
        webSocket = null;

        try{
            if(previousWebSocket) {
                previousWebSocket.onopen = function(){};
                previousWebSocket.onmessage = function(){};
                previousWebSocket.onclose = function(){};

                previousWebSocket.close()
            }
        }catch(error) {
            Log.warn(vip, "websocket-rtc", [new Error("Unable to close websocket"), error]);
        }
    }

    function recreateWebSocket() {
        closeWebSocket();
        createWebSocket();
    }


    function createWebSocket() {
        webSocket = webSocketFactory.newWebSocket();
        isConnected = false;

        for(var header in callMap) {
            var callAction = callMap[header];
            if(!callAction.retryResend) {
                delete callMap[header];

                callAction.reject(Global.REJECTED_BY_TIMEOUT);
            }
        }

        webSocket.onopen = function() {
            if(destroyed) {
                Log.debug(vip, "websocket-rtc", [new Error("webscoket destroyed but websocket.onopen signal captured")]);
                return;
            }

            Log.debug(vip, "websocket-rtc", ["webSocket open: sending LOGIN"]);

            webSocketRpc.invoke("LOGIN", vip, {immediateSend: true})
            .then(function(result){
                Log.debug(vip, "websocket-rtc", ["webSocket LOGIN response: '" + result.data + "'" ]);

                if(result.data != "OK") {
                    Log.warn(vip, "websocket-rtc", [new Error("Login failed, retrying, error reason is '" +  result.data + "'")]);
                    return;
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

                if(!Utils.isEmptyObject(callMap)) {
                    startBusyTimer();
                }else{
                    startIdleTimer();
                }
            })
            .catch((e)=> Log.warn(vip, "websocket-rtc", "Unable to send LOGIN to server: " + e));
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
                    Log.warn("WebSocketRpc: Unexpected message header: '" + header + "'");
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

        startLoginRecreateTimer();
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

    this.isConnected = function() {
        return isConnected;
    }

    this.setBusyTimerInterval = function(value) {
        busyTimerInterval = value;
    }

    this.setIdleTimerInterval = function(value) {
        idleTimerInterval = value;
    }

    this.setLoginRecreateInterval = function(value) {
        loginRecreateInterval = value;

        if(loginRecreateTimerToken) {
            startLoginRecreateTimer();
        }
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
        webSocketRpc.invoke("PING", null, {retryResend: true})
        .catch((e)=> Log.warn(vip, "websocket-rtc", "Unable to send PING to server: " + e));
    }

    this.invoke = function(command, valueArgument, callParameters) {
        var future = webSocketRpc.invokeFuture(command, valueArgument, callParameters);
        return future.promise;
    }

    this.invokeFuture = function(command, valueArgument, callParameters) {
            if(command.indexOf("\n") != -1) {
                throw new Error("End line character: '\\n' is not allowed for WebbSocketRpc method name");
            }

            if(destroyed) {
                return {
                    cancel: cancel,
                    promise: Promise.reject(Global.INSTANCE_DESTROYED)
                };
            }

            if(isConnected) {
                startBusyTimer();
            }

            var cancelled = false;
            var header;

            function cancel() {
                if(cancelled) {
                    return;
                }

                if(callMap[header]) {
                    callMap[header].resolve = function(){}
                    callMap[header].reject = function(){}
                    delete callMap[header];
                }
            }

            var promise = new Promise(function (resolve, reject){

                var callId = nextCallId++;

                header = callId + " " + command;

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

            return {
                cancel: cancel,
                promise: promise
            };
        }

    this.destroy = function() {
        if(destroyed) return;

        destroyed = true;

        closeWebSocket();
        stopAllTimers();

        for(var header in callMap) {
            var callAction = callMap[header];
            delete callMap[header];
            callAction.reject(Global.INSTANCE_DESTROYED);
        }
    }

    this.allocateUsage = function() {
        if(destroyed) {
            throw new Error("WebsocketRpc instance already destroyed")
        }

        allocatedUsagesCounter++;
    }

    this.releaseUsage = function() {
        if(destroyed) {
            return;
        }

        if(--allocatedUsagesCounter == 0) {
            webSocketRpc.destroy();
        }
    }

    webSocketRpc.registerPushHandler("CALL_ERROR", function(event) {
        var message = event.data;
        var lineBreakIndex = message.indexOf("\n");

        var header   = message.substr(0, lineBreakIndex);
        var errorCode = message.substr(lineBreakIndex+1);

        var callAction = callMap[header];

        delete callMap[header];

        callAction.reject(errorCode);
    })

    createWebSocket();
}

