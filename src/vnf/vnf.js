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

    //TODO: clean-up todos
    //TODO: review redundant test related configurations on html page and exract config set  launcher to config.js file
    //TODO: review vnfTest it executes same test multiple times.
    //            vnf test is used only in one place in rtc, move that method to here.
    //TODO: review and remove obsolete code
    //TODO: disable rtc tests
    //TODO: try rtc over websocket hub
    //TODO: VNF System isn't part of VNF - needs decision here.
    //TODO: rename packages and namings to Neuron-Vnf
    //TODO: rename vip to eva
    //TODO: rename big message to name according to specification document
    //TODO: clean-up todos again
    //TODO: run tests in firefox and IE.
    //TODO: should be no failing tests

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


