import "./utils/cycle-buffer-test.js";
import "./utils/signal-captor-test.js";

// VnfHub base channel
import "./channel/base/vnf-hub-retry-test.js";

// Reliable channel
import "./channel/reliable-channel-test.js";

import "./channel/reliable/reliable-channel-message-format-test.js";

import "./channel/reliable/reliable-channel-handshake-test.js";
import "./channel/reliable/reliable-channel-close-connection-test.js";
import "./channel/reliable/reliable-channel-handshake-message-test.js";
import "./channel/reliable/reliable-channel-order-correction-test.js";
import "./channel/reliable/reliable-channel-gap-correction-test.js";
import "./channel/reliable/reliable-channel-connection-lost-test.js";
import "./channel/reliable/reliable-channel-heartbeats-test.js";
import "./channel/reliable/reliable-channel-handshake-retry-test.js";
import "./channel/reliable/reliable-channel-accept-retry-test.js";
import "./channel/reliable/reliable-channel-phantom-messages-test.js";

// Big Message Channel
import "./channel/big-message-channel-test.js";

// WebSocket Channel
import "./channel/websocket/websocket-channel-test.js";
import "./channel/websocket/websocket-connection-reuse-test.js";

// Web Socket Registry client
import "./registry/websocket-registry-client-test.js";

// VNF System Test
//import "./system/vnf-system-test.js";

// WebSocket RPC Test
import "./websocket/websocket-rpc-test.js";

// RTC Test
import "./rtc/rtc-channel-test.js";
