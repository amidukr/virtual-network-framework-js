define(["lib/bluebird", "utils/arrays"], function(Promise){

    function promiseWithTimeout(timeout, getErrorValue, callback) {
      return new Promise(function(r){
        var timeoutFired = false;
        var timeoutHandle = window.setTimeout(function(){
          timeoutFired = true;

          r(getErrorValue());
        }, timeout);

        callback(function(v){
          if(timeoutFired) return;
          window.clearTimeout(timeoutHandle);

          r(v);
        })
      });
    }


    return function SignalCaptor(assert) {
        var self = this;
        var signalStream = [];
        var readers = []

        var timeout = Timeouts.logCaptureTimeout;

        function fireCallbacks() {
            while(true) {
                if(readers.length == 0) return;

                if(readers[0].amount > signalStream.length) return;

                var firstReader = readers.shift();
                firstReader.callback(signalStream.splice(0, firstReader.amount));
            }
        }

        self.signal = function signal(event) {
            signalStream.push(event);
            fireCallbacks();
        }

        self.takeNext = function takeNext(amount) {
            function getStream() {
                var signalStreamClone = signalStream.slice(0)
                signalStreamClone.push("<Captor timeout>");
                return signalStreamClone;
            }

            return promiseWithTimeout(timeout, getStream, function(r){
                readers.push({amount: amount, callback: r});
                fireCallbacks();
            });
        }

        self.peekRemain = function peekRemain() {
            return signalStream.slice();
        }

        self.setTimeout = function(value) {
            timeout = value;
        }

        self.assertSignals = function assertSignals(expected) {
            if(typeof expected == "string") {
              expected = [expected];
            }

            return self.takeNext(expected.length)
                   .then(function(actual){
                        assert.deepEqual(actual, expected,  "Asserting captured signals, expected: " + expected);
                   });
        };

        self.assertSignalsUnordered = function assertSignalsUnordered(expected) {
            if(typeof expected == "string") {
              expected = [expected];
            }

            return self.takeNext(expected.length)
                    .then(function(actual){
                        assert.deepEqual(actual.sort(), expected.sort(),  "Asserting captured signals, expected: " + expected);
                    });
        };

        self.assertSilence = function(timeout) {
            return new Promise(function(r){
              window.setTimeout(function(){
                var logs = self.peekRemain();

                assert.deepEqual(logs, [],  "Captured signals should be empty");
                r();
              }, timeout);
            });
        }
    };
});