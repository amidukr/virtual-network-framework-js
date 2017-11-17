requirejs(["vnf/vnf",
           "utils/signal-captor",
           "utils/logger",
           "test/utils/vnf-test-utils",
           "test/utils/websocket-rpc-test-utils",
           "lib/bluebird"],
function(  Vnf,
           SignalCaptor,
           Log,
           VnfTestUtils,
           WebSocketRpcTestUtils,
           Promise){

    VnfTestUtils.test("WebSocketHub-Integration", "closeConnection after send failed integration test", function(assert){
        assert.ok(false, "TODO: implement similar test case as for unit test - 'closeConnection after send failed test'")
        //TODO: run integrated test with vnf jetty server, to check if vnf jetty server responds correctly for this type of error
        //TODO: implement unit test for this case on vnf jetty server
        //TODO: jetty should repond with error if non endpoint with the same EVA(VIP) found.
    });
});
