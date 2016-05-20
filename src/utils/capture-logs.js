define(["utils/logger", "lib/bluebird", "utils/arrays"], function(Log, Promise){

  var LOG_CAPTURE_TIMEOUT = 10000;

  var logStream = null;
  var onLogUpdatedCallbacks = []
  var lastUsed = 0;
  var streamVersion = 0;

  function promiseWithTimeout(timeout, value, callback) {
      return new Promise(function(r){
        var timeoutFired = false;
        var timeoutHandle = window.setTimeout(function(){
          timeoutFired = true;

          r(value);
        }, timeout);

        callback(function(v){
          if(timeoutFired) return;
          window.clearTimeout(timeoutHandle);

          r(v);
        })
      });
  }

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

    function getNext(callback) {
      if(logStream == null || readerExpectedVersion != streamVersion) {
         throw new Error("Log event cache expired");
      }
      lastUsed = new Date().getTime();

      function isLogEventUnfiltered(logEvent) {
        if(instances.indexOf(logEvent.instance) == -1) return false;
        if(categories.indexOf(logEvent.category) == -1) return false;

        return true;
      }

      function filterCategory(logEvent) {
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
      return promiseWithTimeout(5000, [], function(r){
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
      return promiseWithTimeout(5000, [], function(r){
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

      self.assertLog = function assertLog(expected) {
        if(typeof expected == "string") {
          expected = [expected];
        }

        return logReader.takeNext(expected.length)
           .then(function(actual){
               assert.deepEqual(actual, expected,  "Asserting captured logs");
           });
      };
  }

  Log.captureLogs = function captureLog(assert, identifiers, categories) {
      return new CaptureLog(assert, identifiers, categories);
  };

  return Log;
});