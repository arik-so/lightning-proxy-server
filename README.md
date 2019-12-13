# lightning-proxy-server

A non-custodial, proxy-like service that handles communication with the Lightning Network, mimicking the 
behavior of a full-fledged Lightning node without access to private keys.

## Flow

To act as a Lightning node, the proxy server relies on a client to negotiate a Lightning protocol handshake 
as outlined in BOLT 8.

To do so, the client initially sends a message to the server instructing it which peer to connect to,
alongside a 50-byte blob the server is to send to that peer as part of the initial TCP message.

As soon as the response is received, the proxy immediately forwards it to the client, thereby enabling it
to derive the communication keys, as well as the final blob to forward to the peer.

The client shares the communication keys with the proxy such that the proxy can maintain the connection
without the client present.

When the client's presence is necessary, such as to provide a signature to continue executing the protocol, 
the proxy summons the client by means of either a push notification, a websocket, or some other 
notification mechanism.

[![Flow Diagram](https://github.com/arik-so/lightning-proxy-server/blob/master/docs/flow.png?raw=true)](https://mermaidjs.github.io/mermaid-live-editor/#/edit/eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG4gICAgcGFydGljaXBhbnQgTGlnaHRuaW5nIFByb3h5IENsaWVudCAjIExQQ1xuICAgIHBhcnRpY2lwYW50IExpZ2h0bmluZyBQcm94eSBTZXJ2ZXIgIyBMUFNcbiAgICBwYXJ0aWNpcGFudCBMTkRcbiAgICAjIExpZ2h0bmluZyBQcm94eSBDbGllbnQtPj5MaWdodG5pbmcgUHJveHkgQ2xpZW50OiBHZW5lcmF0ZSBcbiAgICBMaWdodG5pbmcgUHJveHkgQ2xpZW50LT4-TGlnaHRuaW5nIFByb3h5IFNlcnZlcjogTE5EJ3MgdXJsICYgcHVia2V5LCA8aGFuZHNoYWtlX2ZpcnN0X2FjdD5cbiAgICBMaWdodG5pbmcgUHJveHkgU2VydmVyLT4-TE5EOiA8aGFuZHNoYWtlX2ZpcnN0X2FjdD5cbiAgICBMTkQtPj5MaWdodG5pbmcgUHJveHkgU2VydmVyOiA8aGFuZHNoYWtlX3NlY29uZF9hY3Q-XG4gICAgTGlnaHRuaW5nIFByb3h5IFNlcnZlci0-PkxpZ2h0bmluZyBQcm94eSBDbGllbnQ6IDxoYW5kc2hha2Vfc2Vjb25kX2FjdD5cbiAgICBMaWdodG5pbmcgUHJveHkgQ2xpZW50LT4-TGlnaHRuaW5nIFByb3h5IFNlcnZlcjogPGhhbmRzaGFrZV90aGlyZF9hY3Q-LCBrZXlzIGZvciBzZW5kaW5nLCByZWNlaXZpbmcgJiBjaGFpbmluZ1xuICAgIExpZ2h0bmluZyBQcm94eSBTZXJ2ZXItPj5MTkQ6IDxoYW5kc2hha2VfdGhpcmRfYWN0PiwgPGluaXRfbWVzc2FnZT5cbiAgICBMTkQtPj5MaWdodG5pbmcgUHJveHkgU2VydmVyOiA8aW5pdF9tZXNzYWdlPlxuXG5Ob3RlIGxlZnQgb2YgTE5EOiBTb21lIHRpbWUgcGFzc2VzXG5cbiAgICBMTkQtPj5MaWdodG5pbmcgUHJveHkgU2VydmVyOiA8cGluZz5cbiAgICBMaWdodG5pbmcgUHJveHkgU2VydmVyLT4-TE5EOiA8cG9uZz5cblxuTm90ZSBsZWZ0IG9mIExORDogTW9yZSB0aW1lIHBhc3Nlc1xuXG4gICAgTE5ELT4-TGlnaHRuaW5nIFByb3h5IFNlcnZlcjogb3BlbiBjaGFubmVsP1xuICAgIExpZ2h0bmluZyBQcm94eSBTZXJ2ZXItPj5MaWdodG5pbmcgUHJveHkgQ2xpZW50OiBvcGVuIGNoYW5uZWwgc2lnbmF0dXJlP1xuICAgIExpZ2h0bmluZyBQcm94eSBDbGllbnQtPj5MaWdodG5pbmcgUHJveHkgU2VydmVyOiBvcGVuIGNoYW5uZWwgc2lnbmF0dXJlXG4gICAgTGlnaHRuaW5nIFByb3h5IFNlcnZlci0-PkxORDogYWNjZXB0IGNoYW5uZWxcblxuIiwibWVybWFpZCI6eyJ0aGVtZSI6ImRlZmF1bHQifX0)

## Future Musings

## Mobile Wallet

A promising use case involving an irregularly connected client is mobile. A mobile phone, having facilitated the 
initial handshake and a thereupon very infrequently opened app, could receive push notifications for important events
such as payments, allowing the user to briefly open the app merely to sign the necessary corresponding messages and
then immediately leaving it without any consequences for the network's view of the node.

Considering the infrequent nature of payments, the signing operations could potentially even be run in the background,
provided the hosting operating system does not kill the process in the fractions of a second it takes to create a
couple ECDSA signatures. The benefit is that rather than having to constantly keep the app running in the background,
networking and signing operations are invoked iff they are strictly necessary.

## Multiple Devices

If one were to couple the proxy service with a user login system, whereby the node's private keys were encrypted with
some key material derived from the user's credentials, this Lightning node would automatically become accessible from
multiple devices, be they mobile phones or browsers.

## Limitations

This architecture does not come without a bunch of limitations. Some should be fairly simple to mitigate, but others
might entail a lot of additional engineering work.

### Privacy

This one is fairly set in stone. Due to the fact that the proxy relies on having the communication keys, it will always
have visibility into all messages the client sends and receive. This is, however, by design, considering the server's
ability to autonomously send and receive messages is the point.

### Sovereignty

Whenever the client is required to craft a signature to allow the protocol execution to continue, it's usually a 
signature that relies on knowledge of blockchain data. Depending on how thoroughly one may choose to verify that data
(with the options ranging from solely relying on the proxy to provide the latest blockchain data, to downloading block
headers in an SPV client, to validating the entire chain), background operations may become less feasible. In fact,
even foreground operations may take up more time than users would be comfortable with.

The bright side is, however, that the level of trust is customizable.

### Payment Routing

Forwarding HTLC payments relies on knowledge of private keys in order to peel the Sphinx onion. Depending on how
frequently forwarding operations happen, a mobile operating system may penalize the app doing these operations for
consuming too much battery power or requiring too much networking.

### Scalability

Were a corporation to host the proxy service, scaling and migrating instances across different environments may
prove challenging because the TCP sockets need to be kept running. As soon as a connection is shut down, the client
is required to renegotiate the handshake. That means that if migration or software update operations require restarting
nodes, the users may be forced to go offline until they can negotiate a new handshake.

Issues involving scalability can be solved, however, by restarting nodes gracefully, such as waiting for users to
come online so new handshakes could be negotiated instantly, and isolating the TCP socket service from the remainder
of the software to minimize the causes that may necessitate a connection reset.

### Recovery

As previously pointed out, if a connection is terminated, it cannot be rebuilt without the client, as knowledge of the
node's identity private key is necessary to negotiate the Lightning handshake. This is easily mitigated, however, by
extending the push notification protocol to support background handshake renegotiation.

As with routing payments, however, this must not happen too frequently, lest the mobile operating system penalize the
app and thus, the user.

## License

MIT
