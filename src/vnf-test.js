requirejs(
["test/vnf/channel/vnf-channel-test",
//"test/vnf/channel/reliable-channel-test",
"test/vnf/channel/reliable/reliable-channel-handshake-test",
"test/vnf/channel/reliable/reliable-channel-heartbeat-handshake-test",
"test/vnf/channel/reliable/reliable-channel-order-correction-test",
"test/vnf/channel/proxy-channels-test",
"test/utils/cycle-buffer-test"
], function(){})
