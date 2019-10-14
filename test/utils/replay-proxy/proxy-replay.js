import {ReplayProxy} from '../replay-proxy.js';

export const NEW_INSTANCE = "NEW_INSTANCE";
export const METHOD_CALL = "METHOD_CALL";
export const FIRE_EVENT = "FIRE_EVENT";
export const ACCESS_UNDEFINED_PROPERTY = "ACCESS_UNDEFINED_PROPERTY";

export class ReplayWriter {
    constructor() {
        this.__replay = {
            signals: []
        };
        this.__lastInstanceId = -1;
        this.__lastSignalId = -1;
        this.__replayStartTime = new Date().getTime();
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
        var args = Array.prototype.slice.call(args);
        this.__lastInstanceId++
        var signalId = this.nextSignalId();

        this.__replay.signals.push({signalId: signalId, time: this.now(), instanceId: this.__lastInstanceId, action: NEW_INSTANCE, objectType: objectType.name, args, stacktrace: this.getStacktrace()});

        return this.__lastInstanceId;
    }

    signalAccessUndefinedProperty(instanceId, property, typeOfUse) {
        this.__replay.signals.push({signalId: this.nextSignalId(), time: this.now(), instanceId: instanceId, action: ACCESS_UNDEFINED_PROPERTY, propertyName: property, typeOfUse: typeOfUse});
    }

    signalMethod(instanceId, methodName, args, result) {
        var argarray = Array.prototype.slice.call(args);
        var signalId = this.nextSignalId();
        this.__replay.signals.push({signalId:signalId, time: this.now(), instanceId: instanceId, action: METHOD_CALL, methodName: methodName, args: argarray, result: result, stacktrace: this.getStacktrace()});
    }

    signalFireEvent(instanceId, eventType, args) {
        var argarray = Array.prototype.slice.call(args);
        this.__replay.signals.push({signalId: this.nextSignalId(), time: this.now(), instanceId: instanceId, action: FIRE_EVENT, eventType: eventType, args: argarray});
    }

    newProxyMethod(instanceId, target, methodName) {
        var self = this;
        var names = {};
        names[methodName] = function() {
            var argarray = Array.prototype.slice.call(arguments);

            var result;
            try{
                result = target[methodName].apply(target, argarray);
            }finally{
                self.signalMethod(instanceId, methodName, argarray, result);
            }

            return result;
        }

        return function proxyMethod() {
            return names[methodName].apply(names, arguments);
        };
    }

    newProxyEvent(instanceId, proxyObject, eventType, process) {
        var self = this;
        var names = {};
        names[eventType] = function proxyCallback() {
            var argarray = Array.prototype.slice.call(arguments);
            if(process) argarray = process(argarray);
            self.signalFireEvent(instanceId, eventType, argarray);
            if(proxyObject[eventType]) proxyObject[eventType].apply(proxyObject, argarray);
        }

        return function proxyMethod() {
            return names[eventType].apply(names, arguments);
        }
    }

    captureUndefined(target, instanceId) {

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

        return new Proxy(target, {
            set: function(object, prop, value) {
                var descriptor = findDescriptor(target, prop);
                if(descriptor == null || (descriptor.set == null && !descriptor.writable) ) {
                    self.signalAccessUndefinedProperty(instanceId, prop, "SET");
                }

                return target[prop] = value;
            },
            get: function(object, prop) {
                var descriptor = findDescriptor(target, prop);
                if(descriptor == null || (descriptor.get == null && !descriptor.writable) ) {
                    self.signalAccessUndefinedProperty(instanceId, prop, "GET");
                }

                return target[prop];
            }
        });
    }

}
