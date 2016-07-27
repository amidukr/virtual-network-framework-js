define(["vnf/channel/in-browser-hub",
        "vnf/channel/rtc-hub",
        "vnf/channel/unreliable-hub",
        "vnf/channel/reliable-hub",
        "utils/arrays"],
  function(InBrowserHub, RTCHub, UnreliableHub, ReliableHub){
    return {
      InBrowserHub: InBrowserHub,
      UnreliableHub: UnreliableHub,
      ReliableHub: ReliableHub,
      RTCHub: RTCHub,
    }
});


