define(["utils/logger", "vnf/channel/rtc-hub", "vnf/channel/reliable-hub"],
function(Log, RTCHub, ReliableHub) {

    return function ReliableRTCHub(hub) {
        var selfHub = this;

        var rtcHub = new RTCHub(hub);
        ReliableHub.call(selfHub, rtcHub);
    }
});