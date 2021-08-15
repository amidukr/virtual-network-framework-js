import {SignalCaptor} from "../../../../src/utils/signal-captor.js";
import {Log}          from "../../../../src/utils/logger.js";

import {VnfTestUtils}          from "../../../utils/vnf-test-utils.js";
import {WebSocketRpcTestUtils} from "../../../utils/websocket-rpc-test-utils.js";

import {Vnf} from "../../../../src/vnf/vnf.js";

function webSocketStoreTest(description, callback) {
    VnfTestUtils.test("WebSocketRegistryClient", description, {}, function(assert, argument){
        WebSocketRpcTestUtils.setupWebSocketRpcMocks(assert, argument);

        argument.storeClient = new Vnf.WebSocketRegistryClient(argument.webSocketRpc);

        return callback(assert, argument);
    });
}


QUnit.module("WebSocketRegistryClient Tests");
webSocketStoreTest("Create string data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 CREATE-ENTRY\ncollection1\nentry1\nSentry\n value"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 CREATE-ENTRY\noperation-status"))

    argument.storeClient.createEntry({collection: "collection1", name: "entry1"}, "entry\n value")
    .then(function(status) {
        assert.equal(status, "operation-status", "asserting status");
    })
    .then(done);
});

webSocketStoreTest("Create or update string data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry1\nSentry\n value"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 CREATE-OR-UPDATE-ENTRY\noperation-status"))

    argument.storeClient.createOrUpdate({collection: "collection1", name: "entry1"}, "entry\n value")
    .then(function(status) {
        assert.equal(status, "operation-status", "asserting status");
    })
    .then(done)
});

webSocketStoreTest("Get string entry value data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 GET-ENTRY\ncollection1\nentry1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 GET-ENTRY\nSentry-value"))

    argument.storeClient.getEntry({collection: "collection1", name: "entry1"})
    .then(function(entryValue) {
        assert.equal(entryValue, "entry-value", "asserting value");
    })
    .then(done)
});


webSocketStoreTest("Create json data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 0 CREATE-ENTRY\ncollection1\nentry1\nJ{"json":"value"}']))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 CREATE-ENTRY\noperation-status"))

    argument.storeClient.createEntry({collection: "collection1", name: "entry1"}, {"json":"value"})
    .then(function(status) {
        assert.equal(status, "operation-status", "asserting status");
    })
    .then(done)
});

webSocketStoreTest("Create or update json data test",  function(assert, argument){
    var done = assert.async(1);


    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 0 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry1\nJ{"json":"value"}']))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 CREATE-OR-UPDATE-ENTRY\noperation-status"))

    argument.storeClient.createOrUpdate({collection: "collection1", name: "entry1"}, {"json":"value"})
    .then(function(status) {
        assert.equal(status, "operation-status", "asserting status");
    })
    .then(done)
});

webSocketStoreTest("Get json entry value data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 GET-ENTRY\ncollection1\nentry1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, '0 GET-ENTRY\nJ{"json":"value"}'))

    argument.storeClient.getEntry({collection: "collection1", name: "entry1"})
    .then(function(entryValue) {
        assert.deepEqual(entryValue, {"json":"value"}, "asserting value");
    })
    .then(done)
});

webSocketStoreTest("Get entries with body data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 GET-ENTRIES-WITH-BODY\ncollection1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, '0 GET-ENTRIES-WITH-BODY\n6 key1\nS12345\n7 key2\nSABCDEF\n8 key3\nSabc\ndef\n10 key4\nJ{"a":"b"}\n'))



    argument.storeClient.getEntriesWithBody("collection1")
    .then(function(entryValue) {
        assert.deepEqual(entryValue, {key1:"12345",key2:"ABCDEF",key3:"abc\ndef",key4:{"a":"b"}}, "asserting value");
    })
    .then(done)
});

webSocketStoreTest("Delete entry data test",  function(assert, argument){
    var done = assert.async(1);


    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 DELETE-ENTRY\ncollection1\nentry1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 DELETE-ENTRY\noperation-status"))

    argument.storeClient.deleteEntry({collection: "collection1", name: "entry1"})
    .then(function(status) {
        assert.equal(status, "operation-status", "asserting status");
    })
    .then(done)
});

webSocketStoreTest("Fail on Create data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 CREATE-ENTRY\ncollection1\nentry1\nSentry value"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "CALL_ERROR\n0 CREATE-ENTRY\nfail-status"))

    argument.storeClient.createEntry({collection: "collection1", name: "entry1"}, "entry value")
    .then(function(){
        assert.notOk(true, "successful execution should fail");
    }, function(reason){
        assert.equal(reason, "fail-status", "asserting error reason");
    })
    .then(done)
});

webSocketStoreTest("Fail on Create or update data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry1\nSentry value"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "CALL_ERROR\n0 CREATE-OR-UPDATE-ENTRY\nfail-status"))

    argument.storeClient.createOrUpdate({collection: "collection1", name: "entry1"}, "entry value")
    .then(function(){
        assert.notOk(true, "successful execution should fail");
    }, function(reason){
        assert.equal(reason, "fail-status", "asserting error reason");
    })
    .then(done)
});

webSocketStoreTest("Fail on Get entry data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 GET-ENTRY\ncollection1\nentry1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "CALL_ERROR\n0 GET-ENTRY\nfail-status"))

    argument.storeClient.getEntry({collection: "collection1", name: "entry1"})
    .then(function(){
        assert.notOk(true, "successful execution should fail");
    }, function(reason){
        assert.equal(reason, "fail-status", "asserting error reason");
    })
    .then(done)
});

webSocketStoreTest("Fail on Get entries with body data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 GET-ENTRIES-WITH-BODY\ncollection1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, 'CALL_ERROR\n0 GET-ENTRIES-WITH-BODY\nfail-status'))



    argument.storeClient.getEntriesWithBody("collection1")
    .then(function(){
        assert.notOk(true, "successful execution should fail");
    }, function(reason){
        assert.equal(reason, "fail-status", "asserting error reason");
    })
    .then(done)
});

webSocketStoreTest("Fail on Delete entry data test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 DELETE-ENTRY\ncollection1\nentry1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "CALL_ERROR\n0 DELETE-ENTRY\nfail-status"))

    argument.storeClient.deleteEntry({collection: "collection1", name: "entry1"})
    .then(function(){
        assert.notOk(true, "successful execution should fail");
    }, function(reason){
        assert.equal(reason, "fail-status", "asserting error reason");
    })
    .then(done)
});

webSocketStoreTest("Get entries with body data malformed response test",  function(assert, argument){
    var done = assert.async(1);

    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 GET-ENTRIES-WITH-BODY\ncollection1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, '0 GET-ENTRIES-WITH-BODY\n6key1S12345'))

    argument.storeClient.getEntriesWithBody("collection1")
    .then(function(entryValue) {
        assert.notOk(true, "successful execution should fail");
    }, function(error){
        assert.ok(true, "successful execution should fail: " + error);
    })
    .then(done)
});

webSocketStoreTest("Restore store data after re-connect",  function(assert, argument){
    var done = assert.async(1);

    // Emulating Ok response to store data into cache
    Promise.resolve()
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 1))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 CREATE-ENTRY\ncollection1\nentry1\nSentry\n value - 1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 CREATE-ENTRY\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 2 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry2\nSentry\n value - 2"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "2 CREATE-OR-UPDATE-ENTRY\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 3 CREATE-ENTRY\ncollection1\nentry3\nSentry\n value - 3"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "3 CREATE-ENTRY\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 4 CREATE-ENTRY\ncollection2\nentry1\nSentry\n value - 4"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "4 CREATE-ENTRY\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 5 CREATE-ENTRY\ncollection2\nentry2\nSentry\n value - 5"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "5 CREATE-ENTRY\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 6 CREATE-ENTRY\ncollection3\nentry1\nSentry\n value - 6"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "6 CREATE-ENTRY\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 7 CREATE-ENTRY\ncollection4\nentry1\nSentry\n value - 7"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "7 CREATE-ENTRY\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 8 DELETE-ENTRY\ncollection1\nentry3"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "8 DELETE-ENTRY\nOK"))

    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 9 DELETE-ENTRY\ncollection3\nentry1"]))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "9 DELETE-ENTRY\nOK"))


    // Initializing store cache with data
    Promise.resolve()
    .then(argument.storeClient.createEntry.bind(null, {collection: "collection1", name: "entry1"}, "entry\n value - 1"))
    .then(argument.storeClient.createOrUpdate.bind(null, {collection: "collection1", name: "entry2"}, "entry\n value - 2"))
    .then(argument.storeClient.createEntry.bind(null, {collection: "collection1", name: "entry3"}, "entry\n value - 3"))

    .then(argument.storeClient.createEntry.bind(null, {collection: "collection2", name: "entry1"}, "entry\n value - 4"))
    .then(argument.storeClient.createEntry.bind(null, {collection: "collection2", name: "entry2"}, "entry\n value - 5"))

    .then(argument.storeClient.createEntry.bind(null, {collection: "collection3", name: "entry1"}, "entry\n value - 6"))

    .then(argument.storeClient.createEntry.bind(null, {collection: "collection4", name: "entry1"}, "entry\n value - 7"))

    .then(argument.storeClient.deleteEntry.bind(null, {collection: "collection1", name: "entry3"}))
    .then(argument.storeClient.deleteEntry.bind(null, {collection: "collection3", name: "entry1"}))

    // reconnect sequence
    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 10))

    // verifying if client reinitialize store with data from cache
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 11 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry1\nSentry\n value - 1"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 12 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry2\nSentry\n value - 2"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 13 CREATE-OR-UPDATE-ENTRY\ncollection2\nentry1\nSentry\n value - 4"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 14 CREATE-OR-UPDATE-ENTRY\ncollection2\nentry2\nSentry\n value - 5"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 15 CREATE-OR-UPDATE-ENTRY\ncollection4\nentry1\nSentry\n value - 7"]))

    // emulating ok response, except request for value - 4, so it will be removed from cache
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "11 CREATE-OR-UPDATE-ENTRY\nOK"))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "12 CREATE-OR-UPDATE-ENTRY\nOK"))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "13 CREATE-OR-UPDATE-ENTRY\nNOT-OK")) // value - 4 not ok
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "14 CREATE-OR-UPDATE-ENTRY\nOK"))
    .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "15 CREATE-OR-UPDATE-ENTRY\nOK"))


    // verifying if all entries are reinitialized except value - 4
    .then(argument.mockWebSocketFactory.fireOnclose.bind(null))
    .then(WebSocketRpcTestUtils.doLogin.bind(null, argument, 16))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 17 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry1\nSentry\n value - 1"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 18 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry2\nSentry\n value - 2"])) // value 4 no more here
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 19 CREATE-OR-UPDATE-ENTRY\ncollection2\nentry2\nSentry\n value - 5"]))
    .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 20 CREATE-OR-UPDATE-ENTRY\ncollection4\nentry1\nSentry\n value - 7"]))

    .then(done);
});

webSocketStoreTest("Test invalid character handling",  function(assert, argument){

    var storeClient = argument.storeClient;

    function verifyInvalidEOLArguments(methodName, callback) {
        try{
            callback();
            assert.notOk(methodName + ": expected exception not thrown");
        }catch(e) {
            assert.ok(e.message.indexOf("EOL character") != -1, methodName + ": EOL character exception thrown");
        }
    }

    verifyInvalidEOLArguments("createEntry", storeClient.createEntry.bind(null, {collection: "bad\ncollection name", name: "entry name"}, "entry value"));
    verifyInvalidEOLArguments("createEntry", storeClient.createEntry.bind(null, {collection: "collection name", name: "entry\nname"}, "entry value"));

    verifyInvalidEOLArguments("createOrUpdate", storeClient.createOrUpdate.bind(null, {collection: "bad\ncollection name", name: "entry name"}, "entry value"));
    verifyInvalidEOLArguments("createOrUpdate", storeClient.createOrUpdate.bind(null, {collection: "collection name", name: "entry\nname"}, "entry value"));

    verifyInvalidEOLArguments("getEntry", storeClient.getEntry.bind(null, {collection: "bad\ncollection name", name: "entry name"}));
    verifyInvalidEOLArguments("getEntry", storeClient.getEntry.bind(null, {collection: "collection name", name: "entry\nname"}));

    verifyInvalidEOLArguments("getEntriesWithBody", storeClient.getEntriesWithBody.bind(null, "bad\ncollection name"));

    verifyInvalidEOLArguments("deleteEntry", storeClient.deleteEntry.bind(null, {collection: "bad\ncollection name", name: "entry name"}));
    verifyInvalidEOLArguments("deleteEntry", storeClient.deleteEntry.bind(null, {collection: "collection name", name: "entry\nname"}));
});
