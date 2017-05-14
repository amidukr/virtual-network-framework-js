define(["vnf/global", "utils/utils"], function(Global, Utils) {

    function validateKey(key) {
        if(key.collection.indexOf("\n") != -1) throw new Error("WebSocketStore EOL character isn't supported in collection name");
        if(key.name.indexOf("\n") != -1) throw new Error("WebSocketStore EOL character isn't supported in entry name");
    }

    return function InBrowserStore() {
        var clients = {};

        var collections = {}

        function InBrowserStoreClient(vip) {

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

                        if(oldValue.owner != vip) {
                            reject(Global.CREATE_FAILED_DUE_TO_OWNERSHIP_CHECK);
                            return;
                        }
                    }

                    var ownedKeyIndex = ownedKeyLastIndex++;
                    ownedKeys[ownedKeyIndex] = key;
                    collections[key.collection][key.name] = {owner: vip,
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

                if(entry.owner != vip) {
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
                if(collection.indexOf("\n") != -1) throw new Error("WebSocketStore EOL character isn't supported in collection name");

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
                delete clients[vip];

                for(var prop in ownedKeys){
                    removeEntry(ownedKeys[prop]);
                }
            }
        }

        this.connect = function connect(vip) {
            if(clients[vip]) {
                throw new Error("This name already in used");
            }

            clients[vip] = new InBrowserStoreClient(vip);

            return clients[vip];
        }
    };

})