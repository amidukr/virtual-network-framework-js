define(["vnf/global", "utils/utils"], function(Global, Utils) {

    return function WebSocketStoreClient(webSocketRpc) {

        var webSocketStoreClient = this;
        var storeCache = {}

        function putToCache(key, value) {
            var collection = storeCache[key.collection];

            if(!collection) {
                collection= {}
                storeCache[key.collection] = collection;
            }

            collection[key.name] = value;
        }

        function deleteFromCache(key) {
            var collection = storeCache[key.collection];

            if(!collection) return;

            delete collection[key.name];

            if(Utils.isEmptyObject(collection)) {
                delete storeCache[key.collection];
            }
        }

        webSocketRpc.onConnectionOpen(function(){
            for(var collectionName in storeCache) {
                var collection = storeCache[collectionName];

                for(var entryName in collection) {
                    webSocketStoreClient.createOrUpdate({collection: collectionName, name: entryName}, collection[entryName]);
                }
            }

            storeCache = {}
        })

        function validateKey(key) {
            if(key.collection.indexOf("\n") != -1) throw new Error("WebSocketStore EOL character isn't supported in collection name");
            if(key.name.indexOf("\n") != -1) throw new Error("WebSocketStore EOL character isn't supported in entry name");
        }

        function serializeValue(value) {
            if(typeof value == "string") return "S" + value;

            return "J" + JSON.stringify(value);
        }

        function deserializeValue(value) {
            if(value == null || value == "") return value;

            var formatType = value.charAt(0);
            var message = value.substr(1);

            if(formatType == "S") return message;
            if(formatType == "J") return JSON.parse(message);

            throw new Error("Unexpected message format: '" + formatType + "', for message: " + message);
        }

        this.createEntry = function(key, value) {
            validateKey(key);

            return webSocketRpc.call("CREATE-ENTRY", key.collection + "\n" + key.name + "\n" + serializeValue(value))
            .then(function(evt) {
                if(evt.data == Global.OK) {
                    putToCache(key, value);
                }

                return evt.data;
            })
        }

        this.createOrUpdate = function(key, value) {
            validateKey(key);

            return webSocketRpc.call("CREATE-OR-UPDATE-ENTRY", key.collection + "\n" + key.name + "\n" + serializeValue(value))
            .then(function(evt) {
                if(evt.data == Global.OK) {
                    putToCache(key, value);
                }

                return evt.data;
            })
        }

        this.getEntry = function(key, value) {
            validateKey(key);

            return webSocketRpc.call("GET-ENTRY", key.collection + "\n" + key.name)
            .then(function(evt) {
                return deserializeValue(evt.data);
            })
        }

        this.getEntriesWithBody = function(collection) {
            if(collection.indexOf("\n") != -1) throw new Error("EOL character isn't supported in collection name");

            return webSocketRpc.call("GET-ENTRIES-WITH-BODY", collection)
            .then(function(evt){
                var result = {};

                var message = evt.data;

                var index = 0;
                while(index < message.length) {
                    var spaceCharacterIndex = message.indexOf(" ", index);
                    var eolCharacterIndex = message.indexOf("\n", spaceCharacterIndex);

                    var entryValueLength = message.substr(index, spaceCharacterIndex - index) - 0;
                    var entryName  = message.substr(spaceCharacterIndex + 1, eolCharacterIndex - spaceCharacterIndex - 1);
                    var entryValue = message.substr(eolCharacterIndex + 1, entryValueLength);

                    index = eolCharacterIndex + entryValueLength + 2;

                    if(spaceCharacterIndex == -1 || eolCharacterIndex == -1 || isNaN(entryValueLength)) {
                        throw new Error("WebSocketStore Malformed response for getEntriesWithBody from server, response: " + message);
                    }

                    result[entryName] = deserializeValue(entryValue);
                }

                return result;
            });
        }

        this.deleteEntry = function(key) {
            validateKey(key);

            return webSocketRpc.call("DELETE-ENTRY", key.collection + "\n" + key.name)
            .then(function(evt) {
                if(evt.data == Global.OK) {
                    deleteFromCache(key);
                }
                return evt.data;
            })
        }
    };

})