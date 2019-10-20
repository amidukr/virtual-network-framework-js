
// Usage example:
//  Log.debug("instance-id", "category", "message")
//  Log.debug("category", "message")

var ERROR = 0;
var WARN  = 1;
var INFO = 2;
var DEBUG = 3;
var TRACE = 4;

var logLevelMap = {
    "error": ERROR,
    "warn": WARN,
    "info": INFO,
    "debug": DEBUG,
    "trace": TRACE
}

var defaultLevel = ERROR;

var categoryLogLevel = {
    //"reliable-channel-status": DEBUG
    //"webrtc-connecting": INFO,
    //"webrtc-oniceconnectionstatechange": INFO,
    //"webrtc-onsignalingstatechange": INFO
}

var self;
var listeners = [];

self = {
    log: function(level, instance, category, message) {
      if(message == undefined) {
        message = category;
        category = instance;
        instance = undefined;
      }

      var event = {level: level,
                   instance: instance,
                   category: category,
                   message: message};

      for(var i = 0; i < listeners.length; i++) {
        listeners[i](event);
      }

      var allowedLogLevel = categoryLogLevel[category] || defaultLevel;
      var currentLogLevel = logLevelMap[level];

      if(allowedLogLevel >= currentLogLevel) {

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

          console[level].apply(console[level], args);
      }
    },

    trace: function(instance, category, message) {
      self.log("trace", instance, category, message)
    },

    debug: function(instance, category, message) {
      self.log("debug", instance, category, message)
    },

    info: function(instance, category, message) {
      self.log("info", instance, category, message)
    },

    warn: function(instance, category, message) {
      self.log("warn", instance, category, message)
    },

    error: function(instance, category, message) {
      self.log("error", instance, category, message)
    },

    registerListener: function(listener) {
      listeners.push(listener);
    }
};

export {self as Log}