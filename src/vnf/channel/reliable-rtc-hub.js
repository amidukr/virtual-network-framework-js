define(["utils/logger", "vnf/channel/rtc-hub", "vnf/channel/reliable-hub"],
function(Log, RtcHub, ReliableHub) {

    return function ReliableRtcHub(hub) {
        var selfHub = this;

        var rtcHub = new RtcHub(hub);
        ReliableHub.call(selfHub, rtcHub);
    }
});