requirejs(["vnf/vnf",
           "test/utils/vnf-test-utils"],
function(  Vnf,
           VnfTestUtils){

    // invalidate
    // destroy
    //
    //InBrowserHub: InBrowserHub,
    //UnreliableHub: UnreliableHub,
    //ReliableHub: ReliableHub,
    
    function proxyVnfTest(description, callback) {
        function prepareArguments(hubConstructor) {
            return function(assert, args) {
                var rootHub  = args.rootHubFactory();
                var proxyHub = new hubConstructor(rootHub);

                return {rootHub: rootHub, proxyHub: proxyHub};
            }
        }

        VnfTestUtils.vnfTest({description: "[UnreliableHub]: Proxy-Testing " + description, argumentProcessor:prepareArguments(Vnf.UnreliableHub), callback:callback});
    };

    QUnit.module("Proxy Channels Tests");
    proxyVnfTest("closeConnection", function(assert, args){
        var done = assert.async(1);

        var endPointInBrowser = args.rootHub.openEndpoint("vip-1");
        var endPointProxy     = args.proxyHub.openEndpoint("vip-1");

        endPointInBrowser.closeConnection = function(targetVip) {
            assert.equal(targetVip, "target-vip-2");

            endPointProxy.destroy();

            done();
        }

        endPointProxy.closeConnection("target-vip-2");
    })

    proxyVnfTest("destroy", function(assert, args){
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