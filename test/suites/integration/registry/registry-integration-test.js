import {Vnf} from "../../../../src/vnf/vnf.js";
import {sleeper} from "../../../../src/utils/promise-utils.js";
import {Random} from "../../../../src/utils/random.js";

import {VnfTestUtils} from "../../../utils/vnf-test-utils.js";

function registryIntegrationTest(description, callback) {

    function inBrowserArgumentFactory() {

        var sharedRegistry = new Vnf.InBrowserRegistry();

        function newInBrowserClient(eva) {
            return sharedRegistry.connect(eva);
        }

        return {newRegistryClient: newInBrowserClient};
    }


    function webSocketArgument() {
        var webSocketFactory = new Vnf.WebSocketFactory(TestingProfiles.vnfWebSocketUrl);

        function newWebSocketClient(eva) {
            var client = new Vnf.WebSocketRegistryClient(new Vnf.WebSocketRpc(eva, webSocketFactory));

            VnfTestUtils.onTearDown(function(){
                client.destroy();
            })

            return client;
        }

        return {
            newRegistryClient: newWebSocketClient
        }
    }

    VnfTestUtils.test("registryInBrowser", "[Registry Integration tests]: " + description, inBrowserArgumentFactory, callback);
    VnfTestUtils.test("registryWebSocket", "[Registry Integration tests]: " + description, webSocketArgument, callback);
}


QUnit.module("Registry Integration Tests", hooks => {

    var owner1Eva;
    var owner2Eva;
    var collection1Name;
    var collection2Name;
    hooks.beforeEach(function beforeEach(){
        owner1Eva = Random.random6() + "-owner-1";
        owner2Eva = Random.random6() + "-owner-2";

        collection1Name = Random.random6() + "-collection1";
        collection2Name = Random.random6() + "-collection2";
    });

    registryIntegrationTest("Create and get string data test", function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()
        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry value"))
        .then(function(status) {
            assert.equal(status, Vnf.Global.OK, "asserting status");
        })
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
            assert.equal(value, "entry value", "asserting inserted entry");
        })
        .then(done);
    })

    registryIntegrationTest("Create and get json data test", function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()
        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, {"key":"value"}))
        .then(function(status) {
            assert.equal(status, Vnf.Global.OK, "asserting status");
        })
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
            assert.deepEqual(value, {"key":"value"}, "asserting inserted entry");
        })
        .then(done);
    })

    registryIntegrationTest("Create or Update data test", function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()
        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry value"))
        .then(registryClient.createOrUpdate.bind(null, {collection: collection1Name, name:"entry1"}, "updated entry value"))
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
            assert.equal(value, "updated entry value", "asserting updated entry");
        })
        .then(done);
    })

    registryIntegrationTest("Create and Delete data test", function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()
        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry value"))
        .then(registryClient.deleteEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Vnf.Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })
        .then(registryClient.deleteEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Vnf.Global.DELETE_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })
        .then(done);
    })

    registryIntegrationTest("Get failed due to entry not found test",    function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Vnf.Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })
        .then(done);

    })

    registryIntegrationTest("Create failed due to entry already exists test", function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()
        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry value 1"))
        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry value 2"))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Vnf.Global.CREATE_FAILED_ENTRY_ALREADY_EXISTS, "asserting error reason");
        })
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
            assert.equal(value, "entry value 1", "asserting created entry");
        })
        .then(done);
    })

    registryIntegrationTest("Delete failed due to entry not exists yet test", function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()
        .then(registryClient.deleteEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Vnf.Global.DELETE_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })
        .then(done);
    })

    registryIntegrationTest("Create-Get-Delete-Get-Create-Get-Delete-Get test", function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()

        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry value 1"))
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
            assert.equal(value, "entry value 1", "asserting updated entry");
        })

        .then(registryClient.deleteEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(){
            assert.notOk(true, "successful execution should fail");
        }, function(reason){
            assert.equal(reason, Vnf.Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })

        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry value 2"))
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
           assert.equal(value, "entry value 2", "asserting updated entry");
        })

        .then(registryClient.deleteEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(){
           assert.notOk(true, "successful execution should fail");
        }, function(reason){
           assert.equal(reason, Vnf.Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })

        .then(done);
    })


    registryIntegrationTest("Create or Update failed due to owner conflict test", function(assert, argument){
        var done = assert.async(1);

        var registryClient1 = argument.newRegistryClient(owner1Eva);
        var registryClient2 = argument.newRegistryClient(owner2Eva);

        Promise.resolve()

        .then(registryClient1.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "client-1 entry value 1"))
        .then(registryClient2.createOrUpdate.bind(null, {collection: collection1Name, name:"entry1"}, "client-2 entry value 1"))
        .then(function(){
           assert.notOk(true, "successful execution should fail");
        }, function(reason){
           assert.equal(reason, Vnf.Global.UPDATE_FAILED_DUE_TO_OWNERSHIP_CHECK, "asserting error reason");
        })

        .then(registryClient1.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
           assert.equal(value, "client-1 entry value 1", "asserting updated entry");
        })

        .then(registryClient2.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
           assert.equal(value, "client-1 entry value 1", "asserting updated entry");
        })

        .then(done);
    })


    registryIntegrationTest("Delete failed due to owner conflict test", function(assert, argument){
        var done = assert.async(1);

        var registryClient1 = argument.newRegistryClient(owner1Eva);
        var registryClient2 = argument.newRegistryClient(owner2Eva);

        Promise.resolve()

        .then(registryClient1.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "client-1 entry value 1"))
        .then(registryClient2.deleteEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(){
           assert.notOk(true, "successful execution should fail");
        }, function(reason){
           assert.equal(reason, Vnf.Global.DELETE_FAILED_DUE_TO_OWNERSHIP_CHECK, "asserting error reason");
        })

        .then(registryClient1.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
           assert.equal(value, "client-1 entry value 1", "asserting updated entry");
        })

        .then(registryClient2.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
           assert.equal(value, "client-1 entry value 1", "asserting updated entry");
        })

        .then(done);
    })

    registryIntegrationTest("Data List with body test", function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()

        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry1 value"))
        .then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry2"}, "entry2 value"))
        .then(registryClient.createEntry.bind(null, {collection: collection2Name, name:"entry3"}, "entry3 value"))
        .then(registryClient.createEntry.bind(null, {collection: collection2Name, name:"entry4"}, "entry4 value"))
        .then(registryClient.createEntry.bind(null, {collection: collection2Name, name:"entry5"}, {"json":"value"}))

        .then(registryClient.getEntriesWithBody.bind(null, collection1Name))
        .then(function(collection1Entries){
            assert.deepEqual(collection1Entries, {"entry1": "entry1 value",
                                                  "entry2": "entry2 value"});
        })
        .then(registryClient.getEntriesWithBody.bind(null, collection2Name))
        .then(function(collection2Entries){
            assert.deepEqual(collection2Entries, {"entry3": "entry3 value",
                                                  "entry4": "entry4 value",
                                                  "entry5": {"json":"value"}});
        })

        .then(done);
    })

    registryIntegrationTest("Get non-created collection test", function(assert, argument){
        var done = assert.async(1);

        var registryClient = argument.newRegistryClient(owner1Eva);

        Promise.resolve()

        .then(registryClient.getEntriesWithBody.bind(null, collection1Name))
        .then(function(collection1Entries){
            assert.deepEqual(collection1Entries, {});
        })

        .then(done);
    })



    registryIntegrationTest("Create multiple entries, destroy client, records should disappear", function(assert, argument){
        var done = assert.async(1);

        var registryClient1 = argument.newRegistryClient(owner1Eva);
        var registryClient2 = argument.newRegistryClient(owner2Eva);

        Promise.resolve()

        .then(registryClient1.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry1 value"))
        .then(registryClient1.createEntry.bind(null, {collection: collection1Name, name:"entry2"}, "entry2 value"))
        .then(registryClient2.createEntry.bind(null, {collection: collection1Name, name:"entry3"}, "entry3 value"))

        .then(registryClient2.getEntriesWithBody.bind(null, collection1Name))
        .then(function(collection1Entries){
            assert.deepEqual(collection1Entries, {"entry1": "entry1 value",
                                                  "entry2": "entry2 value",
                                                  "entry3": "entry3 value"}, "Verifying initial stored data");
        })

        .then(registryClient2.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(value){
            assert.equal(value, "entry1 value", "getting single inserted entry");
        })


        .then(registryClient1.destroy.bind(null))

        // WebSocket.close doesn't works immediately
        .then(sleeper(200))

        .then(registryClient2.getEntriesWithBody.bind(null, collection1Name))
        .then(function(collection1Entries){
            assert.deepEqual(collection1Entries, {"entry3": "entry3 value"}, "Verifying entry that should be destroyed");
        })

        .then(registryClient2.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
        .then(function(){
           assert.notOk(true, "successful execution should fail");
        }, function(reason){
           assert.equal(reason, Vnf.Global.GET_FAILED_ENTRY_NOT_FOUND, "asserting error reason");
        })

        .then(done);
    })


    registryIntegrationTest("Test invalid character handling",  function(assert, argument){

        var registryClient = argument.newRegistryClient(owner1Eva);

        function verifyInvalidEOLArguments(methodName, callback) {
            try{
                callback();
                assert.notOk(methodName + ": expected exception not thrown");
            }catch(e) {
                assert.ok(e.message.indexOf("EOL character") != -1, methodName + ": EOL character exception thrown");
            }
        }

        verifyInvalidEOLArguments("createEntry", registryClient.createEntry.bind(null, {collection: "bad\ncollection name", name: "entry name"}, "entry value"));
        verifyInvalidEOLArguments("createEntry", registryClient.createEntry.bind(null, {collection: "collection name", name: "entry\nname"}, "entry value"));

        verifyInvalidEOLArguments("createOrUpdate", registryClient.createOrUpdate.bind(null, {collection: "bad\ncollection name", name: "entry name"}, "entry value"));
        verifyInvalidEOLArguments("createOrUpdate", registryClient.createOrUpdate.bind(null, {collection: "collection name", name: "entry\nname"}, "entry value"));

        verifyInvalidEOLArguments("getEntry", registryClient.getEntry.bind(null, {collection: "bad\ncollection name", name: "entry name"}));
        verifyInvalidEOLArguments("getEntry", registryClient.getEntry.bind(null, {collection: "collection name", name: "entry\nname"}));

        verifyInvalidEOLArguments("getEntriesWithBody", registryClient.getEntriesWithBody.bind(null, "bad\ncollection name"));

        verifyInvalidEOLArguments("deleteEntry", registryClient.deleteEntry.bind(null, {collection: "bad\ncollection name", name: "entry name"}));
        verifyInvalidEOLArguments("deleteEntry", registryClient.deleteEntry.bind(null, {collection: "collection name", name: "entry\nname"}));
    })

});