import {ReplayProxy} from '../replay-proxy.js';
import {Log}         from "../../../src/utils/logger.js";

const NEW_INSTANCE = "NEW_INSTANCE";
const NEW_CALLBACK = "NEW_CALLBACK";
const PROPERTY_GET_ACCESS = "PROPERTY_GET_ACCESS";
const METHOD_CALL = "METHOD_CALL";
const CALLBACK_CALL = "CALLBACK_CALL";
const FIRE_EVENT = "FIRE_EVENT";
const ACCESS_UNDEFINED_PROPERTY = "ACCESS_UNDEFINED_PROPERTY";

export class ReplayWriter {
    constructor() {
        this.__replay = {
            signals: []
        };
        this.__lastSignalId = -1;
        this.__lastInstanceId = -1;
        this.__lastCallbackId = -1;
        this.__replayStartTime = new Date().getTime();
    }

    static registerArgumentsTypeConvertor(convertorCallback) {
        ReplayWriter.__argumentTypeConvertors.unshift(convertorCallback);
    }

    static convertorUseArgumentAsIs(type) {
        return element => {
            if(element.constructor.name == type) {
                return element;
            }

            return undefined;
        }
    }

    static argumentToReplayArg(element, ctx) {
        if(element == undefined) return element;

        var converted = false;

        if(element.replayCaptureUndefinedProxyType) {
            element = {
                __class: element.constructor.name,
                replayInstanceId: element.replayInstanceId
            }
            converted = true;
        }

        ReplayWriter.__argumentTypeConvertors.forEach(convertor => {
            var newValue = convertor(element, ctx);

            if(newValue !== undefined) {
                element = newValue;
                converted = true;
            }
        });

        if(!converted) {
            var typeName = element && (element.constructor ? element.constructor.name : typeof element);
            Log.error("proxy-replay", "No ProxyReplay converter for type: " + typeName + "\n" + Error().stack);
            Log.error("proxy-replay", element);

            element = JSON.parse(JSON.stringify(element));
            element.__class = typeName;

            Log.error("proxy-replay", "Replay Object: " + JSON.stringify(element));
        }

        return element;
    }

    static argumentsToReplayArgs(args, ctx) {
        return args.map(arg => ReplayWriter.argumentToReplayArg(arg, ctx));
    }

    static formatCtxReplayArguments(ctx) {
        if(ctx.toRecordArgs) {
            ctx.toRecordArgs = ReplayWriter.argumentsToReplayArgs(ctx.toRecordArgs, ctx);
        }

        if(ctx.result) {
            ctx.toRecordResult = ReplayWriter.argumentToReplayArg(ctx.result, ctx);
        }
    }

    dump() {
        return this.__replay;
    }

    now() {
        return new Date().getTime() - this.__replayStartTime;
    }

    nextSignalId() {
        return ++this.__lastSignalId;
    }

    getStacktrace() {
        return Error().stack.replace("Error\n", "");
    }

    signalNewInstance(objectType, args) {
        args = Array.prototype.slice.call(args);
        this.__lastInstanceId++
        var signalId = this.nextSignalId();

        this.__replay.signals.push({signalId: signalId, time: this.now(), instanceId: this.__lastInstanceId, action: NEW_INSTANCE, objectType: objectType.name, args, stacktrace: this.getStacktrace()});

        return this.__lastInstanceId;
    }

    signalAccessUndefinedProperty(instanceId, property, typeOfUse) {
        Log.error("proxy-replay", `Access undefined property '${property}', instanceId: ${instanceId}, \n${Error().stack}`);
        this.__replay.signals.push({signalId: this.nextSignalId(), time: this.now(), instanceId: instanceId, action: ACCESS_UNDEFINED_PROPERTY, propertyName: property, typeOfUse: typeOfUse, stacktrace: this.getStacktrace()});
    }

    signalPropertyGetAccess(instanceId, propertyName, propertyValue) {
        this.__replay.signals.push({signalId: this.nextSignalId(), time: this.now(), instanceId: instanceId, action: PROPERTY_GET_ACCESS, propertyName: propertyName, propertyValue: propertyValue, stacktrace: this.getStacktrace()});
    }

    signalMethod(instanceId, methodName, args, result) {
        args = Array.prototype.slice.call(args);
        var signalId = this.nextSignalId();
        this.__replay.signals.push({signalId:signalId, time: this.now(), instanceId: instanceId, action: METHOD_CALL, methodName: methodName, args: args, result: result, stacktrace: this.getStacktrace()});
    }

    signalFireEvent(instanceId, eventType, args) {
        args = Array.prototype.slice.call(args);
        this.__replay.signals.push({signalId: this.nextSignalId(), time: this.now(), instanceId: instanceId, action: FIRE_EVENT, eventType: eventType, args: args});
    }

    signalNewCallback(tag) {
        this.__lastCallbackId++
        this.__replay.signals.push({signalId: this.nextSignalId(), time: this.now(), callbackId: this.__lastCallbackId, action: NEW_CALLBACK, tag: tag});
        return this.__lastCallbackId;
    }

    signalCallbackCall(callbackId, args, tag) {
        this.__replay.signals.push({signalId: this.nextSignalId(), time: this.now(), callbackId: callbackId, action: CALLBACK_CALL, tag: tag, args: args});
    }

    newProxyCallback(targetCallback, ctx, tag) {
        var self = this;
        var callbackId =  this.signalNewCallback(tag);

        var names = {};
        names["callback" + callbackId] = function() {
            var ctx = {
                parentCtx: ctx,

                args: Array.prototype.slice.call(arguments),
                toRecordArgs: Array.prototype.slice.call(arguments)
            }

            ReplayWriter.formatCtxReplayArguments(ctx);
            self.signalCallbackCall(callbackId, ctx.toRecordArgs, tag);
            return targetCallback.apply(null, ctx.args);
        }

        return {
            callbackId: callbackId,
            callback: function proxyCallback() {
                return names["callback" + callbackId].apply(names, arguments);
            }
        }
    }

    proxyArguments(ctx, tag) {
        for(var i = 0; i < ctx.args.length; i++) {
            var element = ctx.args[i];
            if(typeof element == 'function') {
                var callbackObject = this.newProxyCallback(element, ctx, `Callback for ${tag}:${i}`);

                ctx.toRecordArgs[i] = `function callback${callbackObject.callbackId}()`;
                ctx.args[i] = callbackObject.callback;
            }
        }
    }

    proxyMethod(instance, methodName, callbacks) {
        var self = this;

        //names variable used to print nice function name in stack trace
        var names = {};
        names[methodName] = function proxyMethod() {
            var ctx = {
                instance: instance,
                args: Array.prototype.slice.call(arguments),
                toRecordArgs: Array.prototype.slice.call(arguments)
            }

            self.proxyArguments(ctx, `instance-${instance.replayInstanceId}:${methodName}`);

            try{
                ctx.result = instance.replayProxyTarget[methodName].apply(instance.replayProxyTarget, ctx.args);
            }finally{
                if(callbacks && callbacks.after) callbacks.after(ctx);
                ReplayWriter.formatCtxReplayArguments(ctx);
                self.signalMethod(instance.replayInstanceId, methodName, ctx.toRecordArgs, ctx.toRecordResult);
            }

            return ctx.result;
        }

        instance[methodName] = function() {
            return names[methodName].apply(names, arguments);
        }
    }

    proxyEvent(instance, eventType, process) {
        var self = this;

        instance[eventType] = null;
        //names variable used to print nice function name in stack trace
        var names = {};
        names[eventType] =  function proxyMethod() {
            var ctx = {
                instance: instance,
                args: Array.prototype.slice.call(arguments),
                toRecordArgs: Array.prototype.slice.call(arguments)
            }

            if(process) process(ctx);
            ReplayWriter.formatCtxReplayArguments(ctx);
            self.signalFireEvent(instance.replayInstanceId, eventType, ctx.toRecordArgs);
            if(instance[eventType]) instance[eventType].apply(instance, ctx.args);
        }

        instance.replayProxyTarget[eventType] = function() {
            return names[eventType].apply(names, arguments);
        };
    }

    proxyProperty(instance, propertyName) {
        var self = this;
        Object.defineProperty(instance, propertyName, {get: function() {
            var value = instance.replayProxyTarget[propertyName];
            self.signalPropertyGetAccess(instance.replayInstanceId, propertyName, value);
            return value;
        }});
    }

    captureUndefined(instance) {

        var self = this;

        function findDescriptor(object, prop) {

            while(object != null) {
                var descriptor = Object.getOwnPropertyDescriptor(object, prop);
                if(descriptor != null) {
                    return descriptor;
                }
                object = object.__proto__;
            }

            return null;
        }

        return new Proxy(instance, {
            set: function(object, prop, value) {
                var descriptor = findDescriptor(instance, prop);
                if(descriptor == null || (descriptor.set == null && !descriptor.writable) ) {
                    if(typeof prop == 'string') {
                        self.signalAccessUndefinedProperty(instance.replayInstanceId, prop, "SET");
                    }
                }

                return instance[prop] = value;
            },
            get: function(object, prop) {
                if(prop == 'replayCaptureUndefinedProxyType') {
                    return true;
                }

                var descriptor = findDescriptor(instance, prop);
                if(descriptor == null || (descriptor.get == null && !descriptor.writable) ) {
                    if(typeof prop == 'string' && prop != 'toJSON') {
                        self.signalAccessUndefinedProperty(instance.replayInstanceId, prop.toString(), "GET");
                    }
                }

                return instance[prop];
            }
        });
    }

}

ReplayWriter.__argumentTypeConvertors = [];

ReplayWriter.registerArgumentsTypeConvertor(ReplayWriter.convertorUseArgumentAsIs("String"));
ReplayWriter.registerArgumentsTypeConvertor(ReplayWriter.convertorUseArgumentAsIs("Object"));

ReplayWriter.registerArgumentsTypeConvertor(function typeConverter(element) {
    if(element.constructor.name == "Promise") {
        return "new Promise(...)";
    }

    return undefined;
});
