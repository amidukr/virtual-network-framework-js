define(function(){
    return function Observable() {
        var self = this;

        var listeners = [];

        self.addListener = function addListener(listener) {
            listeners[listeners.length] = listener;
        }

        self.fire = function fire() {
            for(var i = 0; i < listeners.length; i++) {
                listeners[i].apply(null, arguments);
            }
        }
    }
});