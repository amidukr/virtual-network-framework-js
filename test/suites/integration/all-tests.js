//Channel test suite
import "./channels/basic/basic-channel-test.js";
import "./channels/basic/connection-close-channel-test.js";
import "./channels/basic/extra-channel-test.js";
import "./channels/basic/open-connection-channel-test.js";
import "./channels/basic/reopen-channel-connection-test.js";

import "../flaky/channels/special/reliable-rtc-connection-lost-integration-test.js";
import "../flaky/channels/special/web-socket-channel-test.js";

//Store test suite
import "../flaky/store/store-integration-test.js";
