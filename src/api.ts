import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as expressAsyncHandler from 'express-async-handler';
import * as net from 'net';
import LightningClient from './lightning_client';
import TransmissionHandler from 'bolt08/src/transmission_handler';

export const router = express.Router();

router.get('/', (req, res) => {
	res.send('internal hello')
});

router.post('/connect', bodyParser.json(), expressAsyncHandler(async (req, res) => {
	// generate a connection id
	interface ConnectBody {
		url: string,
		message: string
	}

	const body: ConnectBody = req.body;

	const components = body.url.split('@');
	const publicKey = components[0];
	if (publicKey.length !== 66) {
		throw new Error('public key must be 33 bytes');
	}
	const host = components[1];
	const hostComponents = host.split(':');
	const domain = hostComponents[0];
	const port = parseInt(hostComponents[1]);

	const publicKeyBuffer = Buffer.from(publicKey, 'hex');

	const message = Buffer.from(body.message, 'hex');
	if (message.length !== 50) {
		throw new Error('First message must be 50 bytes');
	}

	const client = new net.Socket();
	const lightningClient = new LightningClient(client);

	client.connect({
		host: domain,
		port
	}, () => {
		client.write(message);
	});

	const response = await lightningClient.receiveData();
	res.send({
		id: lightningClient.id,
		message: response.toString('hex')
	});
}));

router.post('/advance-handshake/:id', bodyParser.json(), expressAsyncHandler(async (req, res) => {
	const clientId: string = req.params.id;
	const lightningClient = LightningClient.getClient(clientId);

	interface AdvanceHandshakeBody {
		message: string,
		keys?: {
			sending: string,
			receiving: string,
			chaining: string
		}
	}

	const body: AdvanceHandshakeBody = req.body;

	if (body.keys) {
		const transmissionHandler = new TransmissionHandler({
			sendingKey: Buffer.from(body.keys.sending, 'hex'),
			receivingKey: Buffer.from(body.keys.receiving, 'hex'),
			chainingKey: Buffer.from(body.keys.chaining, 'hex')
		});
		lightningClient.setTransmissionHandler(transmissionHandler);
	}

	const message = Buffer.from(body.message, 'hex');
	lightningClient.send(message);

	const response = await lightningClient.receiveData();
	res.send({
		message: response.toString('hex')
	});
}));
