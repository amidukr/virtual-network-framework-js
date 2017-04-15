define(["vnf/global",
        "vnf/store/in-browser-store",
        "vnf/channel/in-browser-hub",
        "vnf/channel/rtc-hub",
        "vnf/channel/unreliable-hub",
        "vnf/channel/reliable-hub",
        "vnf/channel/reliable-rtc-hub",
        "utils/arrays"],
  function(Global,
           InBrowserStore,
           InBrowserHub,
           RTCHub,
           UnreliableHub,
           ReliableHub,
           ReliableRTCHub){
    return {
      Global: Global,

      InBrowserStore: InBrowserStore,

      InBrowserHub: InBrowserHub,
      UnreliableHub: UnreliableHub,
      ReliableHub: ReliableHub,
      RTCHub: RTCHub,
      ReliableRTCHub: ReliableRTCHub
    }
});


