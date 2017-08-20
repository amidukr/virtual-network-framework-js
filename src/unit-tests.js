requirejs(
[
//Utils
"test/unit/utils/cycle-buffer-test",
"test/unit/utils/signal-captor-test",

// Reliable channel
"test/unit/channel/reliable-channel-test",

"test/unit/channel/reliable/reliable-channel-handshake-test",
"test/unit/channel/reliable/reliable-channel-heartbeat-handshake-test",
"test/unit/channel/reliable/reliable-channel-order-correction-test",
"test/unit/channel/reliable/reliable-channel-gap-correction-test",
"test/unit/channel/reliable/reliable-channel-connection-lost-test",
"test/unit/channel/reliable/reliable-channel-handshake-retry",

// WebSocket Channel
"test/unit/channel/websocket-channel-test",

// Web Socket Store client
"test/unit/store/websocket-store-client-test",

// VNF System Test
"test/unit/system/vnf-system-test",

// WebSocket RPC Test
"test/unit/websocket/websocket-rpc-test"

], function(){})