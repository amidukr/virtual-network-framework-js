define(["utils/logger", "lib/bluebird", "utils/arrays"], function(Log, Promise){

  var LOG_CAPTURE_TIMEOUT = 10000;

  var logStream = null;
  var onLogUpdatedCallbacks = []
  var lastUsed = 0;
  var streamVersion = 0;

  var initializeLogCache = function initializeLogCache() {
      if(logStream != null) return;

      logStream = [];
      onLogUpdatedCallbacks = [];
      lastUsed = new Date().getTime();
      streamVersion++;
  }

  Log.registerListener(function onLogEvent(event) {
    if(logStream == null) return;

    if(new Date().getTime() - lastUsed > LOG_CAPTURE_TIMEOUT) {
      logStream = null;
      onLogUpdatedCallbacks = [];
      return;
    }

    var callbacks = onLogUpdatedCallbacks;
    onLogUpdatedCallbacks = [];

    logStream.push(event);

    for(var i = 0; i < callbacks.length; i++) {
      callbacks[i](event);
    }
  });

  var LogReader = function LogReader(instances, categories) {
    var self = this;

    initializeLogCache();
    var logIndex = logStream.length;
    var readerExpectedVersion = streamVersion;

    var getNext = function getNext(callback) {
      if(logStream == null || readerExpectedVersion != streamVersion) {
         throw new Error("Log event cache expired");
      }
      lastUsed = new Date().getTime();

      var isLogEventUnfiltered = function isLogEventUnfiltered(logEvent) {
        if(instances.indexOf(logEvent.instance) == -1) return false;
        if(categories.indexOf(logEvent.category) == -1) return false;

        return true;
      }

      var filterCategory = function filterCategory(logEvent) {
        if(isLogEventUnfiltered(logEvent)) {
          callback(logEvent);
        }else{
          getNext(callback);
        }
      };

      if(logIndex < logStream.length) {
        filterCategory(logStream[logIndex++]);
      }else{
        logIndex++;
        onLogUpdatedCallbacks.push(filterCategory);
      }
    }

    self.waitMessage = function(expectedMessage) {
      return new Promise(function(r){
        var onLogEvent = function onLogEvent(logEvent) {
          if(logEvent.message == expectedMessage) {
             r([logEvent.message]);
          }else{
             getNext(onLogEvent);
          }
        };

        getNext(onLogEvent);
      });
    }

    self.takeNext = function(amount){
      return new Promise(function(r){
        var resultingMessages = [];

        if(amount < 0) {
          throw new Error("Illegal amount value: " + amount);
        }

        if(amount == 0) {
          r([])
        }

        var onLogEvent = function onLogEvent(logEvent) {
          resultingMessages.push(logEvent.message);

          if(resultingMessages.length == amount) {
            r(resultingMessages);
          }else{
            getNext(onLogEvent);
          }
        }

        getNext(onLogEvent);
      });
    }
  };

  var CaptureLog = function CaptureLog(assert, identifiers, categories) {
      var self = this;
      var logReader = new LogReader(identifiers, categories);
      var first = true;

      var takeNext = function takeNext(firstMessage, amount) {
        if(first) {
          first = false;
          var resultingMessages = [firstMessage];

          return logReader.waitMessage(firstMessage)
                 .then(logReader.takeNext.bind(logReader, amount - 1))
                 .then(function(messages) {
                    resultingMessages.push.apply(resultingMessages, messages)
                    return resultingMessages;
                 })
        }

        return logReader.takeNext(amount);
      }

      self.assertLog = function assertLog(expected) {
        if(typeof expected == "string") {
          expected = [expected];
        }

        return takeNext(expected[0] ,expected.length)
           .then(function(actual, message){
             message = message || "Asserting captured logs"
             assert.deepEqual(actual, expected, message);
           });
      };
  }

  Log.captureLogs = function captureLog(assert, identifiers, categories) {
      return new CaptureLog(assert, identifiers, categories);
  };

  return Log;
});