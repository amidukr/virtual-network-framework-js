import "./unit/utils/cycle-buffer-test.js";
import "./unit/utils/signal-captor-test.js";

// Reliable channel
import "./unit/channel/reliable-channel-test.js";

import "./unit/channel/reliable/reliable-channel-message-format-test.js";

import "./unit/channel/reliable/reliable-channel-handshake-test.js";
import "./unit/channel/reliable/reliable-channel-handshake-message-test.js";
import "./unit/channel/reliable/reliable-channel-order-correction-test.js";
import "./unit/channel/reliable/reliable-channel-gap-correction-test.js";
import "./unit/channel/reliable/reliable-channel-connection-lost-test.js";
import "./unit/channel/reliable/reliable-channel-heartbeats-test.js";
import "./unit/channel/reliable/reliable-channel-handshake-retry-test.js";
import "./unit/channel/reliable/reliable-channel-accept-retry-test.js";
import "./unit/channel/reliable/reliable-channel-phantom-messages-test.js";

// Big Message Channel
import "./unit/channel/big-message-channel-test.js";

// WebSocket Channel
import "./unit/channel/websocket/websocket-channel-test.js";
import "./unit/channel/websocket/websocket-connection-reuse-test.js";

// Web Socket Store client
import "./unit/store/websocket-store-client-test.js";

// VNF System Test
//import "./unit/system/vnf-system-test.js";

// WebSocket RPC Test
import "./unit/websocket/websocket-rpc-test.js";

// RTC Test
import "./unit/rtc/rtc-channel-test.js";
