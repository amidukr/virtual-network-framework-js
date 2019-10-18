import {ReplayWriter, ReplayProxy} from "../replay-proxy.js"

export function webSocketProxyTypeFactory(nativeWebSocket) {

    function WebSocketReplayProxy(url) {

        var replay = ReplayProxy.getCurrentReplay();

        this.replayInstanceId = replay.signalNewInstance(WebSocketReplayProxy, arguments);
        this.replayProxyTarget = new nativeWebSocket(url);

        var selfProxy = replay.captureUndefined(this);

        replay.proxyEvent(this, "onopen");
        replay.proxyEvent(this, "onmessage", ctx => {
            ctx.args[0] = {
                data: ctx.args[0].data,
                target: selfProxy,
                targetReplayInstanceId: this.replayInstanceId
            }

            ctx.toRecordArgs[0] = ctx.args[0];
        });

        replay.proxyEvent(this, "onclose", ctx => {
            ctx.args[0] = {
                target: selfProxy,
                targetReplayInstanceId: this.replayInstanceId
            }

            ctx.toRecordArgs[0] = ctx.args[0];
        });

        replay.proxyMethod(this ,"close");
        replay.proxyMethod(this ,"send");

        return selfProxy;
    }

    return WebSocketReplayProxy;
}


ReplayWriter.registerArgumentsTypeConvertor(function typeConverter(element, ctx) {

    if(element.target && element.target.constructor.name == 'WebSocket') {
        if(element.type == 'open') {
            return {};
        }
    }

    return undefined;
});
