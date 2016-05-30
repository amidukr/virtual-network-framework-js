requirejs(["vnf/vnf",
           "utils/capture-logs",
           "test/vnf-test-utils"],
function(  VNF,
           Log,
           VNFTestUtils){

    //TODO: message queue
    //TODO: message lost
    //TODO: multiple channel - WebRTC vs WebSocket
    //TODO: generic channel support

    QUnit.test("[Reliable Hub]: Test message lost", function(assert){
        Log.info("test", testCaseDescription);

        var reliableHub = new VNF.ReliableHub({
            channelHub: ...
        });


    });
});