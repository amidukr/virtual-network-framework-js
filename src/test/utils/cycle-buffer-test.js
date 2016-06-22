requirejs(["utils/cycle-buffer", "utils/capture-logs"],
function(  CycleBuffer, Log){

    QUnit.test("[Cycle Buffer Test]: Simple Push", function(assert){
        var buffer = new CycleBuffer();

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        assert.deepEqual(buffer.array, ["message-1", "message-2", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), ["message-1", "message-2", "message-3", "message-4"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 4);
    });


    QUnit.test("[Cycle Buffer Test]: Drop first 3 elements from buffer", function(assert){
        var buffer = new CycleBuffer();

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        buffer.removeFirst(3);

        assert.deepEqual(buffer.array, ["message-1", "message-2", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), ["message-4"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 3);
        assert.equal(buffer.endPointer, 4);
    });

    QUnit.test("[Cycle Buffer Test]: Clear buffer", function(assert){
        var buffer = new CycleBuffer();

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        buffer.removeFirst(4);

        assert.deepEqual(buffer.array, ["message-1", "message-2", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), []);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 0);
    });

    QUnit.test("[Cycle Buffer Test]: Push into the beginning", function(assert){
        var buffer = new CycleBuffer();

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        buffer.removeFirst(2);

        buffer.push("message-5");

        assert.deepEqual(buffer.array, ["message-5", "message-2", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), ["message-3", "message-4", "message-5"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 2);
        assert.equal(buffer.endPointer, 1);
    });

    QUnit.test("[Cycle Buffer Test]: Cycled Buffer full", function(assert){
        var buffer = new CycleBuffer();

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        buffer.removeFirst(2);

        buffer.push("message-5");
        buffer.push("message-6");

        assert.deepEqual(buffer.array, ["message-5", "message-6", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), ["message-3", "message-4", "message-5", "message-6"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 2);
        assert.equal(buffer.endPointer, 2);
    });

    QUnit.test("[Cycle Buffer Test]: Push to cycled full Buffer", function(assert){
        var buffer = new CycleBuffer();

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        buffer.removeFirst(2);

        buffer.push("message-5");
        buffer.push("message-6");

        buffer.push("message-7");

        assert.deepEqual(buffer.array, ["message-3", "message-4", "message-5", "message-6", "message-7"]);
        assert.deepEqual(buffer.toArray(), ["message-3", "message-4", "message-5", "message-6", "message-7"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 5);
    });

    QUnit.test("[Cycle Buffer Test]: Double remove to clear buffer", function(assert){
        var buffer = new CycleBuffer();

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        buffer.removeFirst(1);
        buffer.removeFirst(3);

        assert.deepEqual(buffer.array, ["message-1", "message-2", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), []);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 0);
    });

    QUnit.test("[Cycle Buffer Test]: Double remove to clear Buffer - v2", function(assert){
        var buffer = new CycleBuffer();

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        buffer.removeFirst(3);

        buffer.push("message-5");
        buffer.push("message-6");

        buffer.removeFirst(3);


        assert.deepEqual(buffer.array, ["message-5", "message-6", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), []);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 0);
    });

    QUnit.test("[Cycle Buffer Test]: Push to cleared buffer", function(assert){
        var buffer = new CycleBuffer();

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        buffer.removeFirst(4);

        buffer.push("message-5");


        assert.deepEqual(buffer.array, ["message-5", "message-2", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), ["message-5"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 1);
    });

    QUnit.test("[Cycle Buffer Test]: Sophisticated test", function(assert){
        var buffer = new CycleBuffer();

        assert.deepEqual(buffer.array, []);
        assert.deepEqual(buffer.toArray(), []);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 0);

        buffer.push("message-1");
        buffer.push("message-2");
        buffer.push("message-3");
        buffer.push("message-4");

        assert.deepEqual(buffer.array, ["message-1", "message-2", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), ["message-1", "message-2", "message-3", "message-4"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 4);


        buffer.removeFirst(2);

        assert.deepEqual(buffer.array, ["message-1", "message-2", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), ["message-3", "message-4"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 2);
        assert.equal(buffer.endPointer, 4);


        buffer.push("message-5");

        assert.deepEqual(buffer.array, ["message-5", "message-2", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), ["message-3", "message-4", "message-5"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 2);
        assert.equal(buffer.endPointer, 1);


        buffer.push("message-6");

        assert.deepEqual(buffer.array, ["message-5", "message-6", "message-3", "message-4"]);
        assert.deepEqual(buffer.toArray(), ["message-3", "message-4", "message-5", "message-6"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 2);
        assert.equal(buffer.endPointer, 2);


        buffer.push("message-7");

        assert.deepEqual(buffer.array, ["message-3", "message-4", "message-5", "message-6", "message-7"]);
        assert.deepEqual(buffer.toArray(), ["message-3", "message-4", "message-5", "message-6", "message-7"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 5);


        buffer.removeFirst(5);

        assert.deepEqual(buffer.array, ["message-3", "message-4", "message-5", "message-6", "message-7"]);
        assert.deepEqual(buffer.toArray(), []);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 0);

        buffer.push("message-8");
        assert.deepEqual(buffer.array, ["message-8", "message-4", "message-5", "message-6", "message-7"]);
        assert.deepEqual(buffer.toArray(), ["message-8"]);
        assert.equal(buffer.length, buffer.toArray().length);
        assert.equal(buffer.beginPointer, 0);
        assert.equal(buffer.endPointer, 1);
    });

});