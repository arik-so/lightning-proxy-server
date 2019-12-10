import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as expressAsyncHandler from 'express-async-handler';
import * as crypto from 'crypto';
import * as net from 'net';
import * as util from 'util';
import LightningClient from './lightning_client';

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

	const message = Buffer.from(body.message, 'base64');
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
		message: response.toString('base64')
	});
}));
