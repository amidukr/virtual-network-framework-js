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
//TODO: check gather todo
//TODO: renamve VNF to Vnf

  function(Global,

           WebSocketRpc,

           InBrowserStore,
           WebSocketStoreClient,

           InBrowserHub,
           RTCHub,
           UnreliableHub,
           ReliableHub,
           ReliableRTCHub,
           WebSocketHub,

           VNFSystem){
    return {
      Global: Global,

      WebSocketRpc: WebSocketRpc,

      InBrowserStore:       InBrowserStore,
      WebSocketStoreClient: WebSocketStoreClient,

      InBrowserHub:   InBrowserHub,
      UnreliableHub:  UnreliableHub,
      ReliableHub:    ReliableHub,
      RTCHub:         RTCHub,
      ReliableRTCHub: ReliableRTCHub,
      WebSocketHub:   WebSocketHub,


      System: VNFSystem
    }
});


