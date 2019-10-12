import {SignalCaptor} from "../../../../src/utils/signal-captor.js";
import {sleeper} from "../../../../src/utils/promise-utils.js";

QUnit.module("Signal Captor Test");
QUnit.test("[Signal Captor Test]: Push signal sync", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);

    captor.signal("signal-1");
    captor.signal("signal-2");

    Promise.resolve()
    .then(captor.takeNext.bind(null, 2))
    .then(function(signals){
        assert.deepEqual(signals, ["signal-1", "signal-2"],  "Asserting captor");
    })
    .then(done)
});

QUnit.test("[Signal Captor Test]: Push signal async", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);

    Promise.resolve()
    .then(captor.takeNext.bind(null, 2))
    .then(function(signals){
        assert.deepEqual(signals, ["signal-1", "signal-2"],  "Asserting captor");
    })
    .then(done);

    Promise.resolve()
    .then(sleeper(10))
    .then(captor.signal.bind(null, "signal-1"))
    .then(captor.signal.bind(null, "signal-2"));
});

QUnit.test("[Signal Captor Test]: Push signal mixed", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);

    captor.signal("signal-1");
    captor.signal("signal-2");

    Promise.resolve()
    .then(captor.takeNext.bind(null, 2))
    .then(function(signals){
        assert.deepEqual(signals, ["signal-1", "signal-2"],  "Asserting captor");
    })
    .then(done);

    Promise.resolve()
    .then(sleeper(400))
    .then(captor.signal.bind(null, "signal-2"));
});

QUnit.test("[Signal Captor Test]: Push peek", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);

    captor.signal("signal-1");
    captor.signal("signal-2");
    captor.signal("signal-3");

    assert.deepEqual(captor.peekRemain(), ["signal-1", "signal-2", "signal-3"],  "Asserting captor");
    assert.deepEqual(captor.peekRemain(), ["signal-1", "signal-2", "signal-3"],  "Asserting captor");
    assert.deepEqual(captor.peekRemain(), ["signal-1", "signal-2", "signal-3"],  "Asserting captor");

    Promise.resolve()
    .then(captor.takeNext.bind(null, 2))
    .then(function(signals){
        assert.deepEqual(signals, ["signal-1", "signal-2"],  "Asserting captor");
    })
    .then(function(signals){
        assert.deepEqual(captor.peekRemain(), ["signal-3"],  "Asserting captor");
    })
    .then(done);
})

QUnit.test("[Signal Captor Test]: Push signal async v2", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);

    Promise.resolve()
    .then(captor.takeNext.bind(null, 2))
    .then(function(signals){
        assert.deepEqual(signals, ["signal-1", "signal-2"],  "Asserting captord signals");
    })
    .then(captor.takeNext.bind(null, 1))
    .then(function(signals){
        assert.deepEqual(signals, ["signal-3"],  "Asserting captord signals");
    })
    .then(captor.takeNext.bind(null, 1))
    .then(function(signals){
        assert.deepEqual(signals, ["signal-4"],  "Asserting captord signals");
    })
    .then(done);

    Promise.resolve()
    .then(sleeper(100))
    .then(captor.signal.bind(null, "signal-1"))
    .then(sleeper(100))
    .then(captor.signal.bind(null, "signal-2"))
    .then(sleeper(100))
    .then(captor.signal.bind(null, "signal-3"))
    .then(sleeper(100))
    .then(captor.signal.bind(null, "signal-4"));
});

QUnit.test("[Signal Captor Test]: Timeout no push", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);

    Promise.resolve()
    .then(captor.takeNext.bind(null, 2))
    .then(function(signals){
        assert.deepEqual(signals, ["<Captor timeout>"],  "Asserting captor");
    })
    .then(done);
});

QUnit.test("[Signal Captor Test]: Timeout not enough of push", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);


    Promise.resolve()
    .then(captor.takeNext.bind(null, 2))
    .then(function(signals){
        assert.deepEqual(signals, ["<Captor timeout>"],  "Asserting captor");
    })
    .then(done);

    Promise.resolve()
    .then(sleeper(400))
    .then(captor.signal.bind(null, "signal-1"));
});


QUnit.test("[Signal Captor Test]: Timeout one instead two", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);


    Promise.resolve()
    .then(captor.takeNext.bind(null, 2))
    .then(function(signals){
        assert.deepEqual(signals, ["signal-1", "<Captor timeout>"],  "Asserting captor");
    })
    .then(done);

    Promise.resolve()
    .then(captor.signal.bind(null, "signal-1"));
});

QUnit.test("[Signal Captor Test]: Timeout after successfull captor", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400)


    Promise.resolve()
    .then(captor.takeNext.bind(null, 2))
    .then(function(signals){
        assert.deepEqual(signals, ["signal-1", "signal-2"],  "Asserting captor");
    })
    .then(captor.takeNext.bind(null, 1))
    .then(function(signals){
        assert.deepEqual(signals, ["<Captor timeout>"],  "Asserting captor");
    })
    .then(done);

    Promise.resolve()
    .then(sleeper(50))
    .then(captor.signal.bind(null, "signal-1"))
    .then(sleeper(50))
    .then(captor.signal.bind(null, "signal-2"));
});

QUnit.test("[Signal Captor Test]: Test captor assert", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);

    captor.signal("signal-1");
    captor.signal("signal-2");
    captor.signal("signal-3");


    Promise.resolve()
    .then(captor.assertSignals.bind(null, ["signal-1"]))
    .then(captor.assertSignals.bind(null, ["signal-2", "signal-3"]))
    .then(done);
});

QUnit.test("[Signal Captor Test]: Test captor assert unordered", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);

    captor.signal("signal-1");
    captor.signal("signal-2");
    captor.signal("signal-3");


    Promise.resolve()
    .then(captor.assertSignalsUnordered.bind(null, ["signal-3", "signal-1", "signal-2"]))
    .then(done);
});

QUnit.test("[Signal Captor Test]: Test captor assert unordered", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor(assert);
    captor.setTimeout(400);

    captor.signal("signal-1");
    captor.signal("signal-2");
    captor.signal("signal-3");


    Promise.resolve()
    .then(captor.assertSignalsUnordered.bind(null, ["signal-3", "signal-1", "signal-2"]))
    .then(captor.assertSilence.bind([null, 600]))
    .then(done);
});

QUnit.test("[Signal Captor Test]: Test captor assert should fail", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor({deepEqual: function(actual, expected){
        assert.deepEqual(actual,   ["signal-3", "signal-2", "signal-1"], "Asserting actual")
        assert.deepEqual(expected, ["wrong-1", "wrong-2", "wrong-0"], "Asserting expected")
    }});

    captor.setTimeout(400);

    captor.signal("signal-3");
    captor.signal("signal-2");
    captor.signal("signal-1");


    Promise.resolve()
    .then(captor.assertSignals.bind(null, ["wrong-1", "wrong-2", "wrong-0"]))
    .then(done);
});

QUnit.test("[Signal Captor Test]: Test captor unordered assert should fail", function(assert){
    var done = assert.async(1);

    var captor = new SignalCaptor({deepEqual: function(actual, expected){
        assert.deepEqual(actual,   ["signal-1", "signal-3"], "Asserting actual")
        assert.deepEqual(expected, ["wrong-1", "wrong-2"],               "Asserting expected")
    }});

    captor.setTimeout(400);

    captor.signal("signal-3");
    captor.signal("signal-1");
    captor.signal("signal-2");


    Promise.resolve()
    .then(captor.assertSignalsUnordered.bind(null, ["wrong-2", "wrong-1"]))
    .then(done);
});
