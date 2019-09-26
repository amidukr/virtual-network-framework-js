QUnit.config.autostart = false;

requirejs.config({
  baseUrl: '/base/src'
});

requirejs(
[
"test-config",
"unit-tests"
//"integration-tests"
], function(){
  QUnit.start();
  window.setTimeout(function(){
    QUnit.load();
  }, 500);
})
