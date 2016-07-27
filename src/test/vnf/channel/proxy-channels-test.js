requirejs(["vnf/vnf",
           "utils/capture-logs",
           "test/vnf-test-utils"],
function(  VNF,
           Log,
           VNFTestUtils){

    // invalidate
    // destroy
    //
    //InBrowserHub: InBrowserHub,
    //UnreliableHub: UnreliableHub,
    //ReliableHub: ReliableHub,

    function testProxyHubMethods(channelName, proxyHubFactory) {

        var inBrowserHub = new VNF.InBrowserHub();
        var proxyHub = proxyHubFactory(inBrowserHub);

        QUnit.test("["+ channelName +"-Proxy]: testing invalidate", function(assert){
            var done = assert.async(1);

            var endPointInBrowser = inBrowserHub.openEndpoint("vip-1");
            var endPointProxy     = proxyHub.openEndpoint("vip-1");

            endPointInBrowser.invalidate = function(targetVip) {
                assert.equal(targetVip, "target-vip-2");

                endPointProxy.destroy();

                done();
            }

            endPointProxy.invalidate("target-vip-2");
        })

        QUnit.test("["+ channelName +"-Proxy]: testing destroy", function(assert){
            var endPointInBrowser = inBrowserHub.openEndpoint("vip-1");
            var endPointProxy     = proxyHub.openEndpoint("vip-1");

            var destroyCalled = false;

            endPointInBrowser.destroy = function() {
                destroyCalled = true;
            }

            assert.equal(destroyCalled, false, "Verify destroy haven't been executed, before call")
            endPointProxy.destroy();
            assert.equal(destroyCalled, true, "Verify destroy was executed after call");
        });
    }

    testProxyHubMethods("ReliableHub",   function(parentHub){ return new VNF.ReliableHub(parentHub);   });
    testProxyHubMethods("UnreliableHub", function(parentHub){ return new VNF.UnreliableHub(parentHub); });
});