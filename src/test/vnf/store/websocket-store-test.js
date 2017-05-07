requirejs(["vnf/vnf",
           "utils/signal-captor",
           "utils/logger",
           "test/vnf-test-utils",
           "lib/bluebird"],
function(  VNF,
           SignalCaptor,
           Log,
           VNFTestUtils,
           Promise){

    function webSocketStoreTest(description, callback) {

    }

    function doLogin(argument) {
        return Promise.resolve()
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 0 LOGIN\nendpoint-vip"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "0 LOGIN\nOK"))
    }


    QUnit.module("WebSocketStore Tests");
    webSocketStoreTest("Create string data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 CREATE-ENTRY\ncollection1\nentry1\nSentry value"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 CREATE-ENTRY\nSUCCESS\noperation-status"))

        arguments.storeClient.createEntry({collection: "collection1", name: "entry1"}, "entry value")
        .then(function(status) {
            assert.equal(status, "operation-status", "asserting status");
        }))
        .then(done);
    })

    webSocketStoreTest("Create or update string data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry1\nSentry value"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 CREATE-OR-UPDATE-ENTRY\nSUCCESS\noperation-status"))

        arguments.storeClient.createOrUpdate({collection: "collection1", name: "entry1"}, "entry value")
        .then(function(status) {
            assert.equal(status, "operation-status", "asserting status");
        }))
        .then(done)
    })

    webSocketStoreTest("Get string entry value data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 GET-ENTRY\ncollection1\nentry1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 GET-ENTRY\nSUCCESS\nSentry-value"))

        arguments.storeClient.getEntry({collection: "collection1", name: "entry1"})
        .then(function(entryValue) {
            assert.equal(entryValue, "entry-value", "asserting value");
        }))
        .then(done)
    })


    webSocketStoreTest("Create json data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 1 CREATE-ENTRY\ncollection1\nentry1\nJ{"json":"value"}']))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 CREATE-ENTRY\nSUCCESS\noperation-status"))

        arguments.storeClient.createEntry({collection: "collection1", name: "entry1"}, {"json":"value"})
        .then(function(status) {
            assert.equal(status, "operation-status", "asserting status");
        }))
        .then(done)
    })

    webSocketStoreTest("Create or update json data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ['message: 1 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry1\nJ{"json":"value"}']))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 CREATE-OR-UPDATE-ENTRY\nSUCCESS\noperation-status"))

        arguments.storeClient.createOrUpdate({collection: "collection1", name: "entry1"}, {"json":"value"})
        .then(function(status) {
            assert.equal(status, "operation-status", "asserting status");
        }))
        .then(done)
    })

    webSocketStoreTest("Get json entry value data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 GET-ENTRY\ncollection1\nentry1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, '1 GET-ENTRY\nSUCCESS\nJ{"json":"value"}'))

        arguments.storeClient.getEntry({collection: "collection1", name: "entry1"})
        .then(function(entryValue) {
            assert.deepEqual(entryValue, {"json":"value"}, "asserting value");
        }))
        .then(done)
    })

    webSocketStoreTest("Get entries with body data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 GET-ENTRIES-WITH-BODY\ncollection1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, '1 GET-ENTRIES-WITH-BODY\nSUCCESS\n6 key1\nS12345\n7 key2\nSABCDEF\n10 key3\nJ{"a":"b"}\n'))



        arguments.storeClient.getEntriesWithBody("collection1"})
        .then(function(entryValue) {
            assert.deepEqual(entryValue, {key1:"12345",key2:"ABCDEF",key3:{"a":"b"}}, "asserting value");
        }))
        .then(done)
    })

    webSocketStoreTest("Delete entry data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 DELETE-ENTRY\ncollection1\nentry1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 DELETE-ENTRY\nSUCCESS\noperation-status"))

        arguments.storeClient.deleteEntry({collection: "collection1", name: "entry1"})
        .then(function(entryValue) {
            assert.equal(status, "operation-status", "asserting status");
        }))
        .then(done)
    })

    webSocketStoreTest("Fail on Create data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 CREATE-ENTRY\ncollection1\nentry1\nSentry value"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 CREATE-ENTRY\nFAIL\nfail-status"))

        arguments.storeClient.createEntry({collection: "collection1", name: "entry1"}, "entry value")
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, "fail-status", "asserting error reason");
        })
        .then(done)
    })

    webSocketStoreTest("Fail on Create or update data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 CREATE-OR-UPDATE-ENTRY\ncollection1\nentry1\nSentry value"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 CREATE-OR-UPDATE-ENTRY\nnFAIL\nfail-status"))

        arguments.storeClient.createOrUpdate({collection: "collection1", name: "entry1"}, "entry value")
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, "fail-status", "asserting error reason");
        })
        .then(done)
    })

    webSocketStoreTest("Fail on Get entry data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 GET-ENTRY\ncollection1\nentry1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 GET-ENTRY\nFAIL\nfail-status"))

        arguments.storeClient.getEntry({collection: "collection1", name: "entry1"})
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, "fail-status", "asserting error reason");
        })
        .then(done)
    })

    webSocketStoreTest("Fail on Get entries with body data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 GET-ENTRIES-WITH-BODY\ncollection1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, '1 GET-ENTRIES-WITH-BODY\nFAIL\nfail-status'))



        arguments.storeClient.getEntriesWithBody("collection1"})
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, "fail-status", "asserting error reason");
        })
        .then(done)
    })

    webSocketStoreTest("Fail on Delete entry data test",  function(assert, argument){
        var done = assert.async(1);

        argument.mockWebSocketFactory.fireOnopen();


        Promise.resolve()
        .then(doLogin.bind(null, argument))
        .then(argument.webSocketCaptor.assertSignals.bind(null, ["message: 1 DELETE-ENTRY\ncollection1\nentry1"]))
        .then(argument.mockWebSocketFactory.fireOnmessage.bind(null, "1 DELETE-ENTRY\nFAIL\nfail-status"))

        arguments.storeClient.deleteEntry({collection: "collection1", name: "entry1"})
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, "fail-status", "asserting error reason");
        })
        .then(done)
    })

})