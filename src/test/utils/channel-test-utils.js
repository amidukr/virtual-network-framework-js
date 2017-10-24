define(["vnf/vnf",
           "utils/signal-captor",
           "test/utils/vnf-test-utils",
           "utils/signal-captor"],
function(  Vnf,
           Log,
           VnfTestUtils,
           SignalCaptor){

    function inBrowserFactory(){
        return new Vnf.InBrowserHub();
    }

    function reliableRtcWebSocketFactory(){
        return new Vnf.ReliableRtcHub(webSocketFactory());
    }

    function rtcFactory(){
        return new Vnf.RtcHub(new Vnf.InBrowserHub());
    }

    function bigMessageFactory(){
        return new Vnf.BigMessageHub(new Vnf.InBrowserHub());
    }

    function reliableWebSocketFactory() {
        return new Vnf.ReliableHub(webSocketFactory());
    }

    function webSocketFactory() {
        return new Vnf.WebSocketHub(new Vnf.WebSocketFactory(TestingProfiles.getValue(null, "vnfWebSocketUrl")));
    }

    function reliableFactory() {
        return new Vnf.ReliableHub(new Vnf.InBrowserHub());
    }

    function unreliableFactory() {
        return new Vnf.UnreliableHub(new Vnf.InBrowserHub());
    }

    function reliableRtcFactory() {
        return new Vnf.ReliableRtcHub(new Vnf.InBrowserHub());
    }

    var hubFactories = {
        // Main cases
        "InBrowser":              inBrowserFactory,
        "Reliable Rtc WebSocket": reliableRtcWebSocketFactory,

        // Misc
        "Rtc":                    rtcFactory,
        "Big Message Factory":    bigMessageFactory,
        "WebSocket":              webSocketFactory,
        "Reliable":               reliableFactory,
        "Unreliable":             unreliableFactory,

        // ReliableRtc
        "Reliable Rtc": reliableRtcFactory
    }

    function integrationChannelTest(channelName, description, callback) {
        VnfTestUtils.test(["Channel Integration Tests", channelName], description,    {hubFactory: hubFactories[channelName]}, function(assert, args){
            args.vnfHub = args.hubFactory();
            args.endpointRecipient = args.vnfHub.openEndpoint("recipient");
            args.endpointSender = args.vnfHub.openEndpoint("sender");


            args.recipientCaptor = new SignalCaptor(assert);
            args.senderCaptor    = new SignalCaptor(assert);

            args.endpointRecipient.onMessage = VnfTestUtils.newPrintCallback(args.recipientCaptor, "recipient");
            args.endpointSender.onMessage    = VnfTestUtils.newPrintCallback(args.senderCaptor, "sender");

            callback(assert, args);
        });
    }

    function integrationTest(description, callback) {
        // Main cases
        integrationChannelTest("InBrowser",              description, callback);
        //integrationChannelTest("Reliable Rtc WebSocket", description, callback);


        // Misc
        integrationChannelTest("Rtc",                 description, callback);
        integrationChannelTest("Big Message Factory", description, callback);
        //integrationChannelTest("WebSocket",         description, callback);
        integrationChannelTest("Reliable",            description, callback);
        integrationChannelTest("Unreliable",          description, callback);

        // ReliableRtc
        //integrationChannelTest("Reliable Rtc", description, callback);
    }

    return {hubFactories: hubFactories,
            integrationTest: integrationTest};
})