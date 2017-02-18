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
    
    function proxyVNFTest(description, callback) {
        function prepareArguments(hubConstructor) {
            return function(args) {
                var rootHub  = args.rootHubFactory();
                var proxyHub = new hubConstructor(rootHub);

                return {rootHub: rootHub, proxyHub: proxyHub};
            }
        }

        VNFTestUtils.vnfTest("[ReliableHub]: Proxy-Testing "   + description, prepareArguments(VNF.ReliableHub),   callback);
        VNFTestUtils.vnfTest("[UnreliableHub]: Proxy-Testing " + description, prepareArguments(VNF.UnreliableHub), callback);
    };
    
    proxyVNFTest("invalidate", function(assert, args){
        var done = assert.async(1);

        var endPointInBrowser = args.rootHub.openEndpoint("vip-1");
        var endPointProxy     = args.proxyHub.openEndpoint("vip-1");

        endPointInBrowser.invalidate = function(targetVip) {
            assert.equal(targetVip, "target-vip-2");

            endPointProxy.destroy();

            done();
        }

        endPointProxy.invalidate("target-vip-2");
    })

    proxyVNFTest("destroy", function(assert, args){
        var endPointInBrowser = args.rootHub.openEndpoint("vip-1");
        var endPointProxy     = args.proxyHub.openEndpoint("vip-1");

        var destroyCalled = false;

        endPointInBrowser.destroy = function() {
            destroyCalled = true;
        }

        assert.equal(destroyCalled, false, "Verify destroy haven't been executed, before call")
        endPointProxy.destroy();
        assert.equal(destroyCalled, true, "Verify destroy was executed after call");
    });
});