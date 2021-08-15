import {VnfHub} from "../../../../../src/vnf/channel/base/vnf-hub.js";
import {SignalCaptor} from "../../../../../src/utils/signal-captor.js";

function RetryMockHub(assert){
    var selfHub = this;

    VnfHub.call(selfHub);

    selfHub.VnfEndpoint = function RetryMockEndpoint(selfEva) {
        var self = this;
        selfHub.BaseEndPoint.call(this, selfEva);

        self.capture = new SignalCaptor(assert);

        self.__doOpenConnection = function(connection) {
            self.connection = connection;
            self.capture.signal("__doOpenConnection: " + connection.targetEva);
        }

        self.__doOpenConnection_NextTry = function(connection) {
            self.capture.signal("__doOpenConnection_NextTry: " + connection.targetEva);
        }

        self.__doOpenConnection_CleanBeforeNextTry = function(connection) {
            self.capture.signal("__doOpenConnection_CleanBeforeNextTry: " + connection.targetEva);
        }

        self.__doReleaseConnection = function(connection) {
            self.capture.signal("__doReleaseConnection: " + connection.targetEva);
        }

    }
}

QUnit.module("VnfHub Accept Retry", function(hooks) {

    var hub;
    var sender;

    hooks.beforeEach(function(assert) {
        hub = new RetryMockHub(assert);
        sender = hub.openEndpoint("sender");

        hub.setOpenConnectionRetries(4);
        hub.setEstablishConnectionTimeout(50);
    });

    hooks.afterEach(function(){
        sender.destroy();
    })

    QUnit.test("[VnfHub-RetryTest] Open Connection", function(assert) {
        var done = assert.async(1);

        sender.openConnection("recipient-not-exists", function(event) {
            sender.capture.signal("openConnection: " + event.status);
        })

        Promise.resolve()
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(() => sender.__connectionOpened(sender.connection))

        .then(sender.capture.assertSignals.bind(null, ["openConnection: CONNECTED"]))
        .then(done);
    })

    QUnit.test("[VnfHub-RetryTest] Open Connection Failed test", function(assert) {
        var done = assert.async(1);

        sender.openConnection("recipient-not-exists", function(event) {
            sender.capture.signal("openConnection: " + event.status);
        })

        Promise.resolve()
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doReleaseConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["openConnection: FAILED"]))
        .then(done);
    })

    QUnit.test("[VnfHub-RetryTest] Open Connection - __connectionNextTryFailed", function(assert) {
        var done = assert.async(1);

        hub.setOpenConnectionRetries(2);
        hub.setEstablishConnectionTimeout(10000);

        sender.openConnection("recipient-not-exists", function(event) {
            sender.capture.signal("openConnection: " + event.status);
        })

        Promise.resolve()
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))
        .then(() => sender.__connectionNextTryFailed(sender.connection))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))
        .then(() => sender.__connectionNextTryFailed(sender.connection))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))
        .then(() => sender.__connectionNextTryFailed(sender.connection))

        .then(sender.capture.assertSignals.bind(null, ["__doReleaseConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["openConnection: FAILED"]))
        .then(done);
    });

    QUnit.test("[VnfHub-RetryTest] Open Connection - __connectionOpenFailed", function(assert) {
        var done = assert.async(1);

        sender.openConnection("recipient-not-exists", function(event) {
            sender.capture.signal("openConnection: " + event.status);
        })

        Promise.resolve()
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))
        .then(() => sender.__connectionOpenFailed(sender.connection))

        .then(sender.capture.assertSignals.bind(null, ["__doReleaseConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["openConnection: FAILED"]))
        .then(done);
    });

    QUnit.test("[VnfHub-RetryTest] Open Connection - close connection", function(assert) {
        var done = assert.async(1);

        sender.openConnection("recipient-not-exists", function(event) {
            sender.capture.signal("openConnection: " + event.status);
        })

        Promise.resolve()
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(() => sender.closeConnection("recipient-not-exists"))

        .then(sender.capture.assertSignals.bind(null, ["__doReleaseConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["openConnection: FAILED"]))
        .then(done);
    });

    QUnit.test("[VnfHub-RetryTest] Open Connection - close destroy", function(assert) {
        var done = assert.async(1);

        sender.openConnection("recipient-not-exists", function(event) {
            sender.capture.signal("openConnection: " + event.status);
        })

        Promise.resolve()
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_CleanBeforeNextTry: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["__doOpenConnection_NextTry: recipient-not-exists"]))

        .then(() => sender.destroy())

        .then(sender.capture.assertSignals.bind(null, ["__doReleaseConnection: recipient-not-exists"]))
        .then(sender.capture.assertSignals.bind(null, ["openConnection: FAILED"]))
        .then(done);
    });

    QUnit.test("[VnfHub-RetryTest] Open Connection - __lazyNewConnection", function(assert) {
        var done = assert.async(1);
        var connection = sender.__lazyNewConnection("recipient-not-exists");

        sender.__connectionNextTryFailed(connection);

        Promise.resolve()
        .then(sender.capture.assertSignals.bind(null, ["__doReleaseConnection: recipient-not-exists"]))
        .then(done);
    });
});
