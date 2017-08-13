define(["vnf/global",

        "vnf/websocket/websocket-rpc",
        "vnf/websocket/websocket-facrory",

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

  function(Global,

           WebSocketRpc,
           WebSocketFactory,

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

      WebSocketRpc:     WebSocketRpc,
      WebSocketFactory: WebSocketFactory,

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


