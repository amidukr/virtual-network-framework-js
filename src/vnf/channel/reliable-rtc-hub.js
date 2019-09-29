import {Log} from "../../utils/logger.js";

import {RtcHub}      from "./rtc-hub.js";
import {ReliableHub} from "./reliable-hub.js";

export  function ReliableRtcHub(hub) {
    var selfHub = this;

    var rtcHub = new RtcHub(hub);
    ReliableHub.call(selfHub, rtcHub);
};