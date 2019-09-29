export function xTimeout(timeout, callback) {
    if(callback == undefined) {
        callback = timeout;
        timeout = -1;
    }

    var timeoutID;
    var triggered = false;

    function timeoutCallback() {
        if(triggered) return;

        window.clearTimeout(timeoutID);

        triggered = true;
        callback();
    }

    if(timeout > -1) {
        timeoutID = window.setTimeout(timeoutCallback, timeout);
    }

    return {
        extend: function(newTimeout) {
            if(triggered) return;

            window.clearTimeout(timeoutID);
            timeoutID = window.setTimeout(timeoutCallback, newTimeout);
        },

        trigger: function() {
            timeoutCallback();
        }
    }
}
