import "../utils/arrays.js";

import {Global} from "./global.js";

import {WebSocketRpc}     from "./websocket/websocket-rpc.js";
import {WebSocketFactory} from "./websocket/websocket-facrory.js";

import {InBrowserRegistry}       from "./registry/in-browser-registry.js";
import {WebSocketRegistryClient} from "./registry/websocket-registry-client.js";

import {InBrowserHub}   from "./channel/in-browser-hub.js";
import {RtcHub}         from "./channel/rtc-hub.js";
import {MarshallerHub}  from "./channel/marshaller-channel.js";
import {UnreliableHub}  from "./channel/unreliable-hub.js";
import {ReliableHub}    from "./channel/reliable-hub.js";
import {ReliableRtcHub} from "./channel/reliable-rtc-hub.js";
import {WebSocketHub}   from "./channel/websocket-hub.js";

import {VnfSystem} from "./system/system.js";

var Vnf = {
      Global: Global,

      WebSocketRpc: WebSocketRpc,
      WebSocketFactory: WebSocketFactory,

      InBrowserRegistry: InBrowserRegistry,
      WebSocketRegistryClient: WebSocketRegistryClient,

      InBrowserHub: InBrowserHub,
      UnreliableHub: UnreliableHub,
      ReliableHub: ReliableHub,
      RtcHub: RtcHub,
      MarshallerHub: MarshallerHub,
      ReliableRtcHub: ReliableRtcHub,
      WebSocketHub: WebSocketHub,

      System: VnfSystem
};

export {Vnf}
