QUnit.config.autostart = false;

requirejs(
[
"test-config",
"unit-tests",
"integration-tests"

/* "test/suite/vnf/channel/rtc-channel-test",
"test/suite/vnf/channel/rtc-compatibility-tests",
"test/suite/vnf/channel/proxy-channels-test",
"test/suite/vnf/store/store-integration-test",
"test/suite/vnf/system/vnf-system-integration-test" */
], function(){
  window.setTimeout(function() {
    QUnit.start();
  }, 50);
})

