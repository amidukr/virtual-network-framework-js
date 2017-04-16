requirejs(
["test/vnf/channel/vnf-channel-test",
"test/vnf/channel/rtc-channel-test.js",
"test/vnf/channel/rtc-compatibility-tests.js",
"test/vnf/channel/reliable-channel-test",
"test/vnf/channel/reliable/reliable-channel-handshake-test",
"test/vnf/channel/reliable/reliable-channel-heartbeat-handshake-test",
"test/vnf/channel/reliable/reliable-channel-order-correction-test",
"test/vnf/channel/reliable/reliable-channel-gap-correction-test",
"test/vnf/channel/reliable/reliable-channel-connection-lost-test",
"test/vnf/channel/reliable/reliable-channel-handshake-retry",
"test/vnf/channel/proxy-channels-test",
"test/vnf/store/store-integration-test",
"test/vnf/system/vnf-system-test",
"test/utils/cycle-buffer-test",
"test/utils/signal-captor-test"
], function(){})
