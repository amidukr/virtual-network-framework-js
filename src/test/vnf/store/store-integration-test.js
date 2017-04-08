requirejs(["vnf/vnf",
           "vnf/global",
           "utils/signal-captor",
           "utils/logger",
           "test/vnf-test-utils",
           "lib/bluebird"],
function(  VNF,
           Global,
           SignalCaptor,
           Log,
           VNFTestUtils,
           Promise){

    function storeIntegrationTest(description, callback) {

        function webSocketArgument() {
            var sharedStore = new VNF.InBrowserStore();

            function newOnBrowserClient(vip) {
                return sharedStore.connect(vip);
            }

            return newStoreClient: newOnBrowserClient
        }


        function webSocketArgument() {
            var webSocketFactory = ...;
            function newWebSocketClient(vip) {
                var client = new VNF.WebSocketClientStore(new VNF.WebSocketRpc(vip, webSocketFactory));

                VNFTestUtils.onTearDown(function(){
                    client.destroy();
                })

                return client;
            }

            return {
                newStoreClient: newWebSocketClient
            }
        }

        var storeClient1 = arguments.newStoreClient("owner-1")
        var storeClient2 = arguments.newStoreClient("owner-2")

        // InBrowser Store
        // WebSocket Store
    }


    QUnit.module("Store Integration Tests");
    storeIntegrationTest("Create and get data test", function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.newStoreClient("owner-1");

        Promise.resolve()
        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry value"}))
        .then(function(status) {
            assert.equal(status, Global.OK, "asserting status");
        }))
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
            assert.equal(value, "entry value", "asserting inserted entry");
        })
        .then(done);
    })

    storeIntegrationTest("Create or Update data test", function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.newStoreClient("owner-1");

        Promise.resolve()
        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry value"}))
        .then(storeClient.createOrUpdate.bind(null, {collection: "collection1", name:"entry1"}, "updated entry value"))
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
            assert.equal(value, "updated entry value", "asserting updated entry");
        })
        .then(done);
    })

    storeIntegrationTest("Create and Delete data test", function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.newStoreClient("owner-1");

        Promise.resolve()
        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry value"}))
        .then(storeClient.deleteEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })
        .then(storeClient.deleteEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.DELETE_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })
        .then(done);
    })

    storeIntegrationTest("Get failed due to entry not found test",    function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.newStoreClient("owner-1");

        Promise.resolve()
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })
        .then(done);

    })

    storeIntegrationTest("Create failed due to entry already exists test", function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.newStoreClient("owner-1");

        Promise.resolve()
        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry value 1"}))
        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry value 2"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.CREATE_FAILED_ENTRY_ALREADY_EXISTS, "asserting error reason");
        })
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
            assert.equal(value, "entry value 1", "asserting created entry");
        })
        .then(done);
    })

    storeIntegrationTest("Delete failed due to entry not exists yet test", function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.newStoreClient("owner-1");

        Promise.resolve()
        .then(storeClient.deleteEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.DELETE_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })
        .then(done);
    })

    storeIntegrationTest("Create-Get-Delete-Get-Create-Get-Delete-Get test", function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.newStoreClient("owner-1");

        Promise.resolve()

        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry value 1"}))
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
            assert.equal(value, "entry value 1", "asserting updated entry");
        })

        .then(storeClient.deleteEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })

        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry value 2"}))
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
           assert.equal(value, "entry value 2", "asserting updated entry");
        })

        .then(storeClient.deleteEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(){
           assert.notOk(true, "successful execution should fail");
        }, function(reason){
           assert.equal(reason, Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })

        .then(done);
    })


    storeIntegrationTest("Create or Update failed due to owner conflict test", function(assert, argument){
        var done = assert.async(1);

        var storeClient1 = arguments.newStoreClient("owner-1");
        var storeClient2 = arguments.newStoreClient("owner-2");

        Promise.resolve()

        .then(storeClient1.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "client-1 entry value 1"}))
        .then(storeClient2.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "client-2 entry value 1"}))
        .then(function(){
           assert.notOk(true, "successful execution should fail");
        }, function(reason){
           assert.equal(reason, Global.CREATE_FAILED_DUE_TO_OWNERSHIP_CHECK, "asserting error reason");
        })

        .then(storeClient1.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
           assert.equal(value, "client-1 entry value 1", "asserting updated entry");
        })

        .then(storeClient2.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
           assert.equal(value, "client-1 entry value 1", "asserting updated entry");
        })

        .then(done);
    })


    storeIntegrationTest("Delete failed due to owner conflict test", function(assert, argument){
        var done = assert.async(1);

        var storeClient1 = arguments.newStoreClient("owner-1");
        var storeClient2 = arguments.newStoreClient("owner-2");

        Promise.resolve()

        .then(storeClient1.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "client-1 entry value 1"}))
        .then(storeClient2.deleteEntry.bind(null, {collection: "collection1", name:"entry1"}}))
        .then(function(){
           assert.notOk(true, "successful execution should fail");
        }, function(reason){
           assert.equal(reason, Global.DELETE_FAILED_DUE_TO_OWNERSHIP_CHECK, "asserting error reason");
        })

        .then(storeClient1.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
           assert.equal(value, "client-1 entry value 1", "asserting updated entry");
        })

        .then(storeClient2.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
           assert.equal(value, "client-1 entry value 1", "asserting updated entry");
        })

        .then(done);
    })

    storeIntegrationTest("Data List with body test", function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.newStoreClient("owner-1");

        Promise.resolve()

        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry1 value"}))
        .then(storeClient.createEntry.bind(null, {collection: "collection1", name:"entry2"}, "entry2 value"}))
        .then(storeClient.createEntry.bind(null, {collection: "collection2", name:"entry3"}, "entry3 value"}))
        .then(storeClient.createEntry.bind(null, {collection: "collection2", name:"entry4"}, "entry4 value"}))
        .then(storeClient.createEntry.bind(null, {collection: "collection2", name:"entry5"}, "entry5 value"}))

        .then(storeClient.getEntriesWithBody.bind(null, "collection1"))
        .then(function(collection1Entries){
            assert.deepEqual(collection1Entries, {"entry1": "entry1 value",
                                                  "entry2": "entry2 value"});
        })
        .then(storeClient.getEntriesWithBody.bind(null, "collection1"))
        .then(function(collection2Entries){
            assert.deepEqual(collection1Entries, {"entry1": "entry1 value",
                                                  "entry2": "entry2 value",
                                                  "entry3": "entry3 value"});
        })

        .then(done);
    })

    storeIntegrationTest("Get non-created collection test", function(assert, argument){
        var done = assert.async(1);

        var storeClient = arguments.newStoreClient("owner-1");

        Promise.resolve()

        .then(storeClient.getEntriesWithBody.bind(null, "collection1"))
        .then(function(collection1Entries){
            assert.deepEqual(collection1Entries, {});
        })

        .then(done);
    })



    storeIntegrationTest("Create multiple entries, destroy client, records should disappear", function(assert, argument){
        var done = assert.async(1);

        var storeClient1 = arguments.newStoreClient("owner-1");
        var storeClient2 = arguments.newStoreClient("owner-2");

        Promise.resolve()

        .then(storeClient1.createEntry.bind(null, {collection: "collection1", name:"entry1"}, "entry1 value"}))
        .then(storeClient1.createEntry.bind(null, {collection: "collection1", name:"entry2"}, "entry2 value"}))

        .then(storeClient2.getEntriesWithBody.bind(null, "collection1"))
        .then(function(collection1Entries){
            assert.deepEqual(collection1Entries, {"entry1": "entry1 value",
                                                  "entry2": "entry2 value"});
        })

        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(value){
            assert.equal(value, "entry value", "asserting inserted entry");
        })


        .then(storeClient1.destroy.bind(null))


        .then(storeClient2.getEntriesWithBody.bind(null, "collection1"))
        .then(function(collection1Entries){
            assert.deepEqual(collection1Entries, {});
        })

        .then(storeClient.getEntry.bind(null, {collection: "collection1", name:"entry1"}))
        .then(function(){
           assert.notOk(true, "successful execution should fail");
        }, function(reason){
           assert.equal(reason, Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })

        .then(done);
    })

});
