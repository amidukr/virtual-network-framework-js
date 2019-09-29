import "../utils/arrays.js";

import {Global} from "./global.js";

import {WebSocketRpc}     from "./websocket/websocket-rpc.js";
import {WebSocketFactory} from "./websocket/websocket-facrory.js";

import {InBrowserStore}       from "./store/in-browser-store.js";
import {WebSocketStoreClient} from "./store/websocket-store-client.js";

import {InBrowserHub}   from "./channel/in-browser-hub.js";
import {RtcHub}         from "./channel/rtc-hub.js";
import {BigMessageHub}  from "./channel/big-message-channel.js";
import {UnreliableHub}  from "./channel/unreliable-hub.js";
import {ReliableHub}    from "./channel/reliable-hub.js";
import {ReliableRtcHub} from "./channel/reliable-rtc-hub.js";
import {WebSocketHub}   from "./channel/websocket-hub.js";

import {VnfSystem} from "./system/system.js";

var Vnf = {
      Global: Global,

      WebSocketRpc: WebSocketRpc,
      WebSocketFactory: WebSocketFactory,

      InBrowserStore: InBrowserStore,
      WebSocketStoreClient: WebSocketStoreClient,

      InBrowserHub: InBrowserHub,
      UnreliableHub: UnreliableHub,
      ReliableHub: ReliableHub,
      RtcHub: RtcHub,
      BigMessageHub: BigMessageHub,
      ReliableRtcHub: ReliableRtcHub,
      WebSocketHub: WebSocketHub,

      System: VnfSystem
};

export {Vnf}
