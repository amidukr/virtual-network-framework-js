import {Utils} from "../../../utils/utils.js";

import {Global} from "../../global.js";


var MESSAGE_TYPE_CALL          = "CALL";
var MESSAGE_TYPE_RESPONSE      = "RESPONSE";
var MESSAGE_TYPE_RESPONSE_FAIL = "RESPONSE-FAIL";

export function ServiceCallService(storeHub) {
    return function(vnfEndpoint) {
        var callbackMap = {};
        var nextTokenId = 0;
        var handlersRegistry = {};

        var callTimeout = 2*60*1000;
        var timerActive = false;

        function onTimerEvent() {
            var timerActive = false;
            var callbacksMapEmpty = true;

            for(var eva in callbackMap) {
                var evaCallbacks = callbackMap[eva];

                if(Utils.isEmptyObject(evaCallbacks)) {
                    delete callbackMap[eva];
                    continue;
                }

                for(var token in evaCallbacks) {
                    var callbacks = evaCallbacks[token];
                    callbacks.timeToLive--;
                    if(callbacks.timeToLive == 0) {
                        delete evaCallbacks[token];
                        callbacks.reject(Global.REJECTED_BY_TIMEOUT);
                    }
                }

                callbacksMapEmpty = false;
            }

            // reject callback can make a call, which will re-initiate timer
            // extra check that timer wasn't executed
            if(!timerActive && !callbacksMapEmpty) {
                timerActive = true;
                window.setTimeout(onTimerEvent, callTimeout);
            }
        }

        vnfEndpoint.setCallTimeout = function(value) {
            callTimeout = value;
        }

        function sendResult(event, result) {
            vnfEndpoint.send(event.sourceEva, {
                type:   MESSAGE_TYPE_RESPONSE,
                token:  event.message.token,
                result: result
            })
        }

        function sendReject(event, reason) {
            vnfEndpoint.send(event.sourceEva, {
                type:   MESSAGE_TYPE_RESPONSE_FAIL,
                token:  event.message.token,
                reason: reason
            })
        }

        function handleCall(event) {
            var message = event.message;
            var handler = handlersRegistry[message.method];
            if(!handler) {
                sendReject(event, Global.CALL_FAILED_UNKNOWN_METHOD);
                return;
            }

            Promise.resolve()
            .then(handler.bind(null,
                    { message: message.argument,
                      method:  message.method,
                      sourceEva: event.sourceEva,
                      endpoint: vnfEndpoint }))
            .then(function(value){
                if(value instanceof Error) {
                    sendReject(event, value.message);
                }else{
                    sendResult(event, value);
                }
            },function(){
                sendReject(event, Global.CALL_FAILED_UNEXPECTED_EXCEPTION);
            })
        }

        function handleResponse(event) {
            var message = event.message;
            var evaCallbacks = callbackMap[event.sourceEva];
            var callbacks = evaCallbacks && evaCallbacks[message.token];
            if(callbacks) {
                delete evaCallbacks[message.token];
                callbacks.resolve(message.result);
            }
        }

        function handleResponseFailed(event) {
            var message = event.message;
            var evaCallbacks = callbackMap[event.sourceEva];
            var callbacks = evaCallbacks && evaCallbacks[message.token];
            if(callbacks) {
                delete evaCallbacks[message.token];
                callbacks.reject(message.reason);
            }
        }

        function vnfPush(eva, method, argument) {
            vnfEndpoint.send(eva, {
               type: MESSAGE_TYPE_CALL,
               token: nextTokenId++,
               method: method,
               argument: argument
           })
        }

        function vnfCall(eva, method, argument) {
            return new Promise(function(resolve, reject){
                var tokenId = nextTokenId;
                var evaCallbacks = callbackMap[eva];

                if(!timerActive) {
                    timerActive = true;
                    window.setTimeout(onTimerEvent, callTimeout);
                }

                if(!evaCallbacks) {
                    evaCallbacks = {}
                    callbackMap[eva] = evaCallbacks;
                }

                evaCallbacks[tokenId] = {
                   timeToLive: 2,
                   resolve: resolve,
                   reject: reject
                }

                vnfPush(eva, method, argument);
           })
        }

        function onConnectionLost(targetEva) {
            var evaCallbacks = callbackMap[targetEva];

            if(!evaCallbacks) return;

            for(var token in evaCallbacks) {
                evaCallbacks[token].reject(Global.FAILED_DUE_TO_CONNECTION_LOST);
                delete evaCallbacks[token];
            }
        }

        return {
            initialize: function() {
                var handlers = vnfEndpoint.serviceLookupCall("handlers");
                var messageHandlers = vnfEndpoint.serviceLookupCall("messageHandlers");
                for(var i = 0; i < handlers.length; i++) {
                    var handlers = handlers[i];
                    for(var methods in handlers) {
                        handlersRegistry[methods] = handlers[methods];
                    }
                }

                vnfEndpoint.call = vnfCall;
                vnfEndpoint.push = vnfPush;
            },

            messageHandlers: {
                "CALL":          handleCall,
                "RESPONSE":      handleResponse,
                "RESPONSE-FAIL": handleResponseFailed
            },

            onConnectionLost: onConnectionLost
        }
    }
}
