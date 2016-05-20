define([], function(){

    // Usage example:
    //  Log.debug("instance-id", "category", "message")
    //  Log.debug("category", "message")

    var self;
    var listeners = [];

    return self = {
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

          if(instance) {
            console[level]("[" + category + "] - [" + instance  + "]: " + message);
          }else{
            console[level]("[" + category + "]: " + message);
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

        error: function(instance, category, message) {
          self.log("error", instance, category, message)
        },

        registerListener: function(listener) {
          listeners.push(listener);
        }
    };
});