import "./test/unit/utils/cycle-buffer-test.js";
import "./test/unit/utils/signal-captor-test.js";

// Reliable channel
import "./test/unit/channel/reliable-channel-test.js";

import "./test/unit/channel/reliable/reliable-channel-message-format-test.js";

import "./test/unit/channel/reliable/reliable-channel-handshake-test.js";
import "./test/unit/channel/reliable/reliable-channel-handshake-message-test.js";
import "./test/unit/channel/reliable/reliable-channel-order-correction-test.js";
import "./test/unit/channel/reliable/reliable-channel-gap-correction-test.js";
import "./test/unit/channel/reliable/reliable-channel-connection-lost-test.js";
import "./test/unit/channel/reliable/reliable-channel-heartbeats-test.js";
import "./test/unit/channel/reliable/reliable-channel-handshake-retry-test.js";
import "./test/unit/channel/reliable/reliable-channel-accept-retry-test.js";
import "./test/unit/channel/reliable/reliable-channel-phantom-messages-test.js";

// Big Message Channel
import "./test/unit/channel/big-message-channel-test.js";

// WebSocket Channel
import "./test/unit/channel/websocket/websocket-channel-test.js";
import "./test/unit/channel/websocket/websocket-connection-reuse-test.js";

// Web Socket Store client
import "./test/unit/store/websocket-store-client-test.js";

// VNF System Test
//import "./test/unit/system/vnf-system-test.js";

// WebSocket RPC Test
import "./test/unit/websocket/websocket-rpc-test.js";

// RTC Test
import "./test/integration/channels/special/rtc-channel-test.js";
