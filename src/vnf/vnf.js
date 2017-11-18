define(["vnf/global",

        "vnf/websocket/websocket-rpc",
        "vnf/websocket/websocket-facrory",

        "vnf/store/in-browser-store",
        "vnf/store/websocket-store-client",

        "vnf/channel/in-browser-hub",
        "vnf/channel/rtc-hub",
        "vnf/channel/big-message-channel",
        "vnf/channel/unreliable-hub",
        "vnf/channel/reliable-hub",
        "vnf/channel/reliable-rtc-hub",
        "vnf/channel/websocket-hub",

        "vnf/system/system",

        "utils/arrays"],

    //TODO: review and remove obsolete code
    //TODO: rename vip to eva
    //TODO: rename big message to name according to specification document
    //TODO: disable rtc tests
    //TODO: try rtc over websocket hub
    //TODO: should be no failing tests
    //TODO: clean-up todos

  function(Global,

           WebSocketRpc,
           WebSocketFactory,

           InBrowserStore,
           WebSocketStoreClient,

           InBrowserHub,
           RtcHub,
           BigMessageHub,
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
      BigMessageHub: BigMessageHub,
      ReliableRtcHub: ReliableRtcHub,
      WebSocketHub:   WebSocketHub,


      System: VnfSystem
    }
});


