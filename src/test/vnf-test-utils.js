define(["utils/logger"], function(Log){
    var VNFTestUtils = {
        newPrintCallback: function (instance, version) {
            return function onMessage(event) {
                var message = event.message;
                if(typeof message == "object") {
                    message = JSON.stringify(message);
                }

                description = "";
                if(version) {
                    description += version +": ";
                }
                description += "from " + event.sourceVIP + ": " + message;

                Log.info(instance, "message-test-handler", description);
            }
        },

        newInstance: function (Cls) {
            if(typeof Cls != 'function') throw new Error("Can't apply 'new' operator to non-function argument");

            return new (Function.prototype.bind.apply(Cls, arguments));
        },

        classFactoryMethod: function(Cls) {
            if(typeof Cls != 'function') throw new Error("Can't create class factory function for non-function argument");
            var args = [Cls];
            [].push.apply(args, arguments);

            return VNFTestUtils.newInstance.bind.apply(VNFTestUtils.newInstance, args);
        }
    };

    return VNFTestUtils;
});