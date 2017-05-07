define(["vnf/global",

        "vnf/websocket/websocket-rpc",

        "vnf/store/in-browser-store",

        "vnf/channel/in-browser-hub",
        "vnf/channel/rtc-hub",
        "vnf/channel/unreliable-hub",
        "vnf/channel/reliable-hub",
        "vnf/channel/reliable-rtc-hub",

        "vnf/system/system",

        "utils/arrays"],
  function(Global,

           WebSocketRpc,

           InBrowserStore,

           InBrowserHub,
           RTCHub,
           UnreliableHub,
           ReliableHub,
           ReliableRTCHub,

           VNFSystem){
    return {
      Global: Global,

      WebSocketRpc: WebSocketRpc,

      InBrowserStore: InBrowserStore,

      InBrowserHub: InBrowserHub,
      UnreliableHub: UnreliableHub,
      ReliableHub: ReliableHub,
      RTCHub: RTCHub,
      ReliableRTCHub: ReliableRTCHub,

      System: VNFSystem
    }
});


