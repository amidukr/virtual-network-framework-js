import {ReplayWriter, ReplayProxy} from "../replay-proxy.js"


export function rtcPeerConnectionProxyTypeFactory(nativeRtcPeerConnection) {

    function RtcPeerConnectionReplayProxy(configuration) {
        var replay = ReplayProxy.getCurrentReplay();

        this.replayProxyTarget = new nativeRtcPeerConnection(configuration);
        this.replayInstanceId = replay.signalNewInstance(RtcPeerConnectionReplayProxy, arguments);

        replay.proxyMethod(this, "createDataChannel", {
            after: ctx => {
                ctx.result = new RTCDataChannelReplayProxy(ctx.result);
            }
        });

        replay.proxyMethod(this, "setRemoteDescription");
        replay.proxyMethod(this, "createOffer");
        replay.proxyMethod(this, "setLocalDescription");
        replay.proxyMethod(this, "createAnswer");
        replay.proxyMethod(this, "addIceCandidate");
        replay.proxyMethod(this, "close");

        replay.proxyEvent(this, "onsignalingstatechange");
        replay.proxyEvent(this, "onconnectionstatechange");
        replay.proxyEvent(this, "oniceconnectionstatechange");
        replay.proxyEvent(this, "onicecandidate");
        replay.proxyEvent(this, "ondatachannel", ctx => {
            ctx.args[0] = { channel : new RTCDataChannelReplayProxy(ctx.args[0].channel) };
            ctx.toRecordArgs[0] = { channel : ctx.args[0].channel };
            ctx.toRecordArgs[0].channel = ReplayWriter.argumentToReplayArg(ctx.toRecordArgs[0].channel, ctx);
        });

        return replay.captureUndefined(this);
    }

    return RtcPeerConnectionReplayProxy;
}

function RTCDataChannelReplayProxy(target) {
    var self = this;

    var replay = ReplayProxy.getCurrentReplay();

    this.replayProxyTarget = target;
    this.replayInstanceId = replay.signalNewInstance(RTCDataChannelReplayProxy, arguments);

    replay.proxyMethod(this, "send");
    replay.proxyMethod(this, "close");

    replay.proxyEvent(this, "onopen");
    replay.proxyEvent(this, "onmessage");
    replay.proxyEvent(this, "onclose");

    replay.proxyProperty(this, "readyState");

    return replay.captureUndefined(this);
}



ReplayWriter.registerArgumentsTypeConvertor(ReplayWriter.convertorUseArgumentAsIs('RTCIceCandidate'));
ReplayWriter.registerArgumentsTypeConvertor(ReplayWriter.convertorUseArgumentAsIs('RTCDataChannelReplayProxy'));
ReplayWriter.registerArgumentsTypeConvertor(ReplayWriter.convertorUseArgumentAsIs('RTCSessionDescription'));

ReplayWriter.registerArgumentsTypeConvertor(function typeConverter(element) {
    if(element.target && element.target.constructor.name.endsWith('RTCPeerConnection')) {
        if(element.constructor.name == 'Event') {
            if(['signalingstatechange', 'iceconnectionstatechange', 'connectionstatechange'].indexOf(element.type) != -1) {
                return {
                    target: {
                        signalingState:     element.target.signalingState,
                        iceConnectionState: element.target.iceConnectionState,
                        iceGatheringState:  element.target.iceGatheringState
                    }
                }
            }
        }

        if(element.constructor.name == 'RTCPeerConnectionIceEvent') {
            return {
                candidate: element.candidate
            };
        }
    }

    if(element.target && element.target.constructor.name.endsWith('RTCDataChannel')) {
        if(element.constructor.name == 'Event') {
            if(['open', 'close'].indexOf(element.type) != -1 ) {
                return {};
            }
        }

        if(element.constructor.name == 'MessageEvent') {
            if(element.type == 'message') {
                return {data: element.data};
            }
        }


    }

    return undefined;
});
