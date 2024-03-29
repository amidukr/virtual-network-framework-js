import {Utils} from "../../utils/utils.js";

import {Global}  from "../global.js";

function validateKey(key) {
    if(key.collection.indexOf("\n") != -1) throw new Error("WebSocketRegistry EOL character isn't supported in collection name");
    if(key.name.indexOf("\n") != -1) throw new Error("WebSocketRegistry EOL character isn't supported in entry name");
}

export function InBrowserRegistry() {
    var clients = {};

    var collections = {}

    function InBrowserRegistryClient(eva) {

        var ownedKeyLastIndex = 0;
        var ownedKeys     = {};

        function putEntry(failIfExists, key, value) {
            validateKey(key);

            return new Promise(function(resolve, reject){
                if(!collections[key.collection]) {
                    collections[key.collection] = {}
                }

                var oldValue = collections[key.collection][key.name];
                if(oldValue) {
                    if(failIfExists) {
                        reject(Global.CREATE_FAILED_ENTRY_ALREADY_EXISTS)
                        return;
                    }

                    if(oldValue.owner != eva) {
                        reject(Global.UPDATE_FAILED_DUE_TO_OWNERSHIP_CHECK);
                        return;
                    }
                }

                var ownedKeyIndex = ownedKeyLastIndex++;
                ownedKeys[ownedKeyIndex] = key;
                collections[key.collection][key.name] = {owner: eva,
                                                         value: value,
                                                         ownedKeyIndex: ownedKeyIndex}

                resolve(Global.OK);
            })
        }

        function removeEntry(key) {
            var collection = collections[key.collection];
            var entry = collection && collection[key.name];

            if(!entry) {
                return Global.DELETE_FAILED_ENTRY_NOT_FOUND;
            }

            if(entry.owner != eva) {
                return Global.DELETE_FAILED_DUE_TO_OWNERSHIP_CHECK;
            }

            delete ownedKeys[entry.ownedKeyIndex];
            delete collection[key.name];

            if(Utils.isEmptyObject(collection)) {
                delete collections[key.collection];
            }

            return false;
        }


        this.createOrUpdate = function createEntry(key, value) {
            return putEntry(false, key, value);
        }

        this.createEntry = function createEntry(key, value) {
            return putEntry(true, key, value);
        }

        this.getEntry = function(key, value) {
            validateKey(key);

            return new Promise(function(resolve, reject){
                var collection = collections[key.collection];
                var entry = collection && collection[key.name];

                if(!entry) {
                    reject(Global.GET_FAILED_ENTRY_NOT_FOUND);
                    return;
                }

                return resolve(entry.value);
            })
        }

        this.getEntriesWithBody = function(collection) {
            if(collection.indexOf("\n") != -1) throw new Error("WebSocketRegistry EOL character isn't supported in collection name");

            return new Promise(function(resolve){
                var collectionSet = collections[collection];

                var result = {};

                if(collectionSet) {
                    for (var prop in collectionSet) {
                      result[prop] = collectionSet[prop].value;
                    }
                }

                return resolve(result);
            });
        }

        this.deleteEntry = function(key) {
            validateKey(key);

            return new Promise(function(resolve, reject){
                var errorCode = removeEntry(key);

                if(!errorCode) {
                    resolve(Global.OK);

                }else{
                    reject(errorCode);
                }
            })
        }

        this.destroy = function() {
            delete clients[eva];

            for(var prop in ownedKeys){
                removeEntry(ownedKeys[prop]);
            }
        }
    }

    this.connect = function connect(eva) {
        if(clients[eva]) {
            throw new Error("This name already in used");
        }

        clients[eva] = new InBrowserRegistryClient(eva);

        return clients[eva];
    }
};
