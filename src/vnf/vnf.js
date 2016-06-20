define(["vnf/channel/in-browser-hub",
        "vnf/channel/rtc-hub",
        "vnf/channel/unreliable-hub",
        "utils/arrays"],
  function(InBrowserHub, RTCHub, UnreliableHub){
    return {
      InBrowserHub: InBrowserHub,
      UnreliableHub: UnreliableHub,
      RTCHub: RTCHub,
    }
});


