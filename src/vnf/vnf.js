define(["vnf/global",

        "vnf/websocket/websocket-rpc",

        "vnf/store/in-browser-store",
        "vnf/store/websocket-store-client",

        "vnf/channel/in-browser-hub",
        "vnf/channel/rtc-hub",
        "vnf/channel/unreliable-hub",
        "vnf/channel/reliable-hub",
        "vnf/channel/reliable-rtc-hub",
        "vnf/channel/websocket-hub",

        "vnf/system/system",

        "utils/arrays"],

//TODO: VIP -> Vip

  function(Global,

           WebSocketRpc,

           InBrowserStore,
           WebSocketStoreClient,

           InBrowserHub,
           RtcHub,
           UnreliableHub,
           ReliableHub,
           ReliableRtcHub,
           WebSocketHub,

           VnfSystem){
    return {
      Global: Global,

      WebSocketRpc: WebSocketRpc,

      InBrowserStore:       InBrowserStore,
      WebSocketStoreClient: WebSocketStoreClient,

      InBrowserHub:   InBrowserHub,
      UnreliableHub:  UnreliableHub,
      ReliableHub:    ReliableHub,
      RtcHub:         RtcHub,
      ReliableRtcHub: ReliableRtcHub,
      WebSocketHub:   WebSocketHub,


      System: VnfSystem
    }
});


