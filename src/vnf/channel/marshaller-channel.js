import {Log}       from "../../utils/logger.js";
import {xTimeout}  from "../../utils/xtimeout.js";

import {Global}   from "../global.js";
import {ProxyHub} from "./base/vnf-proxy-hub.js";

var DEFAULT_FRAGMENT_SIZE = 64*1024;

export function MarshallerHub(parentHub, configuration){
    var selfHub = this;
    ProxyHub.call(selfHub, parentHub);

    configuration = configuration || {}
    var fragmentSize = configuration.fragmentSize || DEFAULT_FRAGMENT_SIZE;

    selfHub.VnfEndpoint = function BigMessageEndpoint(selfEva) {
        var self = this;
        selfHub.ProxyEndpoint.call(self, selfEva);

        var parentEndpoint = self.parentEndpoint;

        self.setAnyTypeSupported(true);

        parentEndpoint.onConnectionOpen(function(targetEva){
            self.__acceptConnection(targetEva);
        })

        parentEndpoint.onConnectionLost(function(targetEva){
            self.closeConnection(targetEva);
        });

        parentEndpoint.onMessage = function(event) {
            var connection = self.__lazyNewConnection(event.sourceEva);

            var message = event.message;

            var messageLen = connection.messageLen;

            if(messageLen == null) {
                // First fragment of new message
                connection.messageType = message.substr(0, 1);
                var lenDigit = message.substr(1, 1) - 0;
                connection.messageLen = message.substr(2, lenDigit) - 0;
                connection.messageFragment = message.substr(2 + lenDigit);

                messageLen = connection.messageLen;
            } else {
                connection.messageFragment += message;
            }

            var messageFragment = connection.messageFragment;

            if(messageFragment.length == messageLen) {
                connection.messageLen = null;

                var message = connection.messageType == "J" ? JSON.parse(messageFragment) : messageFragment;

                var onMessage = self.onMessage;
                try {
                    onMessage && onMessage({message: message,
                                            sourceEva: event.sourceEva,
                                            endpoint: self});
                }catch(e) {
                    Log.error(selfEva, "big-message", ["Error in onMessage handler: ", e]);
                }

                connection.messageFragment = null;
                connection.messageType = null;
            }
        }

        self.__doOpenConnection = function(connection) {
            parentEndpoint.openConnection(connection.targetEva, function(event) {
                if(event.status == Global.FAILED) {
                    self.__connectionOpenFailed(connection);
                }else{
                    self.__connectionOpened(connection);
                }
            })
        }

        self.__doSend = function(connection, message) {
            var messageData;
            var messageType;

            if(typeof message == "string") {
                messageData = message;
                messageType = "S";
            }else{
                messageData = JSON.stringify(message);
                messageType = "J";
            }

            var msgLen = messageData.length + "";
            var lenDigit = msgLen.length + "";
            if(lenDigit.length > 1) {
                throw new Error("Message length to big: " + msgLen);
            }

            var position = 0;

            while(position < msgLen) {
                var msgChunk = messageData.substr(position, fragmentSize);
                var fragment = position == 0 ? messageType + lenDigit + msgLen +  msgChunk : msgChunk;
                parentEndpoint.send(connection.targetEva, fragment);
                position += msgChunk.length;
            }
        }

    };
}
