import {ReplayWriter, ReplayProxy} from "../replay-proxy.js"

export function webSocketProxyTypeFactory(nativeWebSocket) {

    function WebSocketReplayProxy(url) {

        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;

        var replay = ReplayProxy.getCurrentReplay();
        var instanceId = replay.signalNewInstance(WebSocketReplayProxy, arguments);
        var target = new nativeWebSocket(url);

        var self = this;
        var selfInstance = replay.captureUndefined(self, instanceId);

        target.onopen = replay.newProxyEvent(instanceId, self, "onopen");
        target.onmessage = replay.newProxyEvent(instanceId, self, "onmessage", (args) => {
            return [{data: args[0].data,
                    target: selfInstance,
                    targetInstanceId: instanceId}];
        });

        target.onclose = replay.newProxyEvent(instanceId, self, "onclose", (args) => {
            return [{target: selfInstance,
                     targetInstanceId: instanceId}];
        });

        this.close = replay.newProxyMethod(instanceId, target ,"close");
        this.send = replay.newProxyMethod(instanceId, target ,"send");

        return selfInstance;
    }

    return WebSocketReplayProxy;
}
