
// Usage example:
//  Log.debug("instance-id", "category", "message")
//  Log.debug("category", "message")

export const ERROR = 0;
export const WARN  = 1;
export const INFO = 2;
export const DEBUG = 3;
export const VERBOSE = 4;

var logLevelMap = {
    "error": ERROR,
    "warn": WARN,
    "info": INFO,
    "debug": DEBUG,
    "verbose": VERBOSE
}

var defaultLevel = INFO;

var categoryLogLevel = {}

export class Log {
    static setDefaultLogLevel(value) {
        defaultLevel = value;
    }

    static log(level, instance, category, message) {
        var allowedLogLevel = categoryLogLevel[category] || defaultLevel;
        var currentLogLevel = logLevelMap[level];

        if(allowedLogLevel < currentLogLevel) return;

        if(message == undefined) {
            message = category;
            category = instance;
            instance = undefined;
        }

        var event = {level: level,
                   instance: instance,
                   category: category,
                   message: message};

        var formattedDate = Date.prototype.toISOString ? new Date().toISOString() : "";

        var args;
        if(instance) {
            args = [formattedDate + " [" + category + "] - [" + instance  + "]: "];
        }else{
            args = [formattedDate + " [" + category + "]: "];
        }

        if(message && message.constructor.name == "Array" ) {
            args.push.apply(args, message);
        }else{
            args.push(message);
        }

        var logMethod = level == 'verbose' ? "debug" : level;
        console[logMethod].apply(console[level], args);
    }

    static verbose(instance, category, message) {
        Log.log("verbose", instance, category, message)
    }

    static debug(instance, category, message) {
        Log.log("debug", instance, category, message)
    }

    static info(instance, category, message) {
        Log.log("info", instance, category, message)
    }

    static warn(instance, category, message) {
        Log.log("warn", instance, category, message)
    }

    static error(instance, category, message) {
        Log.log("error", instance, category, message)
    }
};