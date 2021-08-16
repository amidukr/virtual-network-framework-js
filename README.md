[![Build Status](https://api.travis-ci.org/amidukr/virtual-network-framework-js.svg?branch=master)](https://travis-ci.org/amidukr/virtual-network-framework-js)
[![codecov](https://codecov.io/gh/amidukr/virtual-network-framework-js/branch/master/graph/badge.svg)](https://codecov.io/gh/amidukr/virtual-network-framework-js)

# Overview

This javascript client side part of VNF framework for peer-to-peer communication.

It has two essential parts:
- **VNF Hub** - used to create channel between vnf endpoints
- **VNF Registry** - registry for endpoint discovery

# Specification

More details about framework design can be found in specification:
[VNF Specification](./docs/amid-ukr-vnf.pdf)

# VNF Channels

VNF Channels are use for peer-to-peer communication.

Supported channels

- **InBrowserHub** - the simples hub for peer-to-peer, for communication of endpoint inside a browser, used mostly for testing and mocking.
- **WebSocketHub** - uses web socket server for peer-to-peer comunication, and can be used as signaling channel to establish WebRTC connection.
- **ReliableHub** - proxy hub, that can handle different network and connectivity issues.
- **RtcHub** - hub for peer-to-peer channels, requires hub which will be used as signaling channels. 
- **ReliableRtcHub** - combines RtcHub and ReliableHub
- **MarshallerHub** - proxy hub that can handle big message and can marshal/unmarshal js object into json.
- **UnreliableHub** - proxy hub that create issue for chaos testing.

## Example

### Hub usage flow

```js
// Creating in browser hub of endpoints
const vnfHub = new Vnf.InBrowserHub()

// Creating endpoint in hub
const endpoint1 = vnfHub.openEndpoint("endpoint1-name")
const endpoint2 = vnfHub.openEndpoint("endpoint2-name")

// Listening to messages
endpoint1.onMessage = function(event) {
    console.info("Endpoint-1 got a message from endpoint " + event.sourceEva + ", message is: " + event.message)

    if(event.message == "I am good!") {
        console.info("Endpoint 1 is closing connection to " + event.sourceEva)
        endpoint1.closeConnection(event.sourceEva)
    }
}

endpoint2.onMessage = function(event) {
    console.info("Endpoint-2 got a message from endpoint " + event.sourceEva + ", message is: " + event.message)

    if(event.message == "How are you?") {
        endpoint2.send(event.sourceEva, "I am good!")
    }
}

// Handling close connection and releasing endpoints

endpoint2.onConnectionLost(function(targetEva){
    console.info("Endpoint-2 lost connection to " + targetEva + ", releasing endpoints")
    endpoint1.destroy()
    endpoint2.destroy()
})

// Open connection and sending handshake message

endpoint1.openConnection("endpoint2-name", function(event){
    if(event.status != "CONNECTED") return;

    console.info("Endpoint-1 established connection to " + event.targetEva + ", status is: " + event.status)

    endpoint1.send(event.targetEva, "How are you?")
})


```

### WebSocket usage

```js
// Creating in browser hub of endpoints
const vnfHub = new Vnf.WebSocketHub(new Vnf.WebSocketFactory("wss://<server-host-name>/webbroker/vnf-ws"));

// Creating endpoint in hub
const endpoint1 = vnfHub.openEndpoint("endpoint1-name")
const endpoint2 = vnfHub.openEndpoint("endpoint2-name")

// Rest part the same as InBrowserHub
...

```

### WebSocket usage

```js
// Creating in browser hub of endpoints
const webSocketFactory = new Vnf.WebSocketFactory("wss://<server-host-name>/webbroker/vnf-ws")
const vnfHub = new Vnf.WebSocketHub(webSocketFactory);

// Creating endpoint in hub
const endpoint1 = vnfHub.openEndpoint("endpoint1-name")
const endpoint2 = vnfHub.openEndpoint("endpoint2-name")

// Rest part the same as InBrowserHub
...

```
### WebRTC with WebSocket as signaling channel

```js
// Creating in browser hub of endpoints
const webSocketFactory = new Vnf.WebSocketFactory("wss://<server-host-name>/webbroker/vnf-ws")
const vnfHub = new Vnf.RtcHub(new Vnf.WebSocketHub(webSocketFactory));

// Creating endpoint in hub
const endpoint1 = vnfHub.openEndpoint("endpoint1-name")
const endpoint2 = vnfHub.openEndpoint("endpoint2-name")

// Rest part the same as InBrowserHub
...

```

### Marshaller + Reliable over WebRtc with WebScoket as signaling

```js
// Creating in browser hub of endpoints
const webSocketFactory = new Vnf.WebSocketFactory("wss://<server-host-name>/webbroker/vnf-ws")
const vnfHub = new Vnf.MarshallerHub(new Vnf.ReliableRtcHub((webSocketFactory)));

// Creating endpoint in hub
const endpoint1 = vnfHub.openEndpoint("endpoint1-name")
const endpoint2 = vnfHub.openEndpoint("endpoint2-name")

// Rest part the same as InBrowserHub
...

```

# VNF Registry

VNF Registry is used for discovery.

For example chat application can use it can register for chat channel, so other user can use registry to find active chats to connect. Registry entry will remain available until client channel will be closed or lost.

Two registries implementation are supported:
- **InBrowserRegistry** - registry in browser memory, used for testing and mocking
- **WebSocketRegistryClient** - registry client over websocket protocol

## Examples

### InBrowserRegistry

```js

const sharedRegistry = new Vnf.InBrowserRegistry();
const registryClient = sharedRegistry.connect("endpoint1-name")

Promise.resolve()
.then(registryClient.createEntry.bind(null, {collection: collection1Name, name:"entry1"}, "entry value"))
.then(function(status) {
    assert.equal(status, Vnf.Global.OK, "asserting status");
})
.then(registryClient.getEntry.bind(null, {collection: collection1Name, name:"entry1"}))
.then(function(value){
    assert.equal(value, "entry value", "asserting inserted entry");
})
.then(done);
```

### WebSocketRegistry example
```js
const webSocketFactory = new Vnf.WebSocketFactory("wss://<server-host-name>/webbroker/vnf-ws")
const registryClient = new Vnf.WebSocketRegistryClient(new Vnf.WebSocketRpc(eva, webSocketFactory))

// Rest part the same as InBrowserRegistry
...

```

### WebSocketRegistry and WebScoketHub
```js
const webSocketFactory = new Vnf.WebSocketFactory("wss://<server-host-name>/webbroker/vnf-ws")
const vnfHub = new Vnf.WebSocketHub(webSocketFactory);

// Creating endpoint in hub
const endpoint1 = vnfHub.openEndpoint("endpoint1-name")
const registryClient = new Vnf.WebSocketRegistryClient(endpoint1.getWebSocketRpc())

// Rest part the same as InBrowserRegistry
...

```