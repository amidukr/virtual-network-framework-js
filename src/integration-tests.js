requirejs(
[
//Channel test
"test/integration/channels/basic/basic-channel-test",
"test/integration/channels/basic/connection-close-channel-test",
"test/integration/channels/basic/extra-channel-test",
"test/integration/channels/basic/open-connection-channel-test",

"test/integration/channels/special/reliable-rtc-connection-lost-integration-test",
"test/integration/channels/special/rtc-channel-test"

], function(){})