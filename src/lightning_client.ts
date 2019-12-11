import {Socket} from 'net';
import * as crypto from 'crypto';
import {TransmissionHandler} from 'bolt08';
import {LightningMessage, Message} from 'bolt02';

export default class LightningClient {

	private static clients = {};

	private static readonly ZERO_BUFFER = Buffer.alloc(0);

	public readonly id: string;
	private readonly socket: Socket;

	// unprocessed and undecrypted data
	private pendingRawData: Buffer = LightningClient.ZERO_BUFFER;

	// TODO (arik): queue of unread messages to be used once transmission handler is set
	private messageQueue: Buffer[] = [];

	private dataPromise: Promise<Buffer>;
	private dataResolve;
	private dataReject;

	private transmissionHandler: TransmissionHandler;

	constructor(socket: Socket) {
		this.socket = socket;
		this.id = crypto.randomBytes(8).toString('hex');

		LightningClient.clients[this.id] = this; // add this to the list

		this.socket.on('data', (data: Buffer) => {
			console.log('Received:');
			console.log(data.toString('hex'), '\n');

			this.processIncomingData(data);
		});

		this.socket.on('error', (error: Error) => {
			console.log('Error:');
			console.log(error);
			this.destroy(error);
		});

		this.socket.on('close', () => {
			console.log('Connection closed');
			this.destroy();
		});

	}

	public static getClient(id: string): LightningClient {
		const client = this.clients[id];
		if (!client) {
			throw new Error('client not found');
		}
		return client;
	}

	public setTransmissionHandler(handler: TransmissionHandler) {
		if (this.transmissionHandler) {
			throw new Error('transmission handler already set');
		}
		this.transmissionHandler = handler;
	}

	private processIncomingData(data: Buffer) {
		this.pendingRawData = Buffer.concat([this.pendingRawData, data]);

		// without a transmission handler, we resolve it all
		if (!this.transmissionHandler) {
			if (this.dataPromise) {
				this.dataResolve(this.pendingRawData);
				this.pendingRawData = LightningClient.ZERO_BUFFER;
				this.dataPromise = null;
			}
			return;
		}

		const decryptionResult = this.transmissionHandler.receive(this.pendingRawData);
		this.pendingRawData = decryptionResult.unreadBuffer;
		const decryptedResponse = decryptionResult.message;

		if (!decryptedResponse || decryptedResponse.length === 0) {
			console.log('Too short too decrypt');
			return;
		}

		console.log('Decrypted:');
		console.log(decryptedResponse.toString('hex'), '\n');

		// parse the lightning message
		const lightningMessage = LightningMessage.parse(decryptedResponse);
		console.log('Decoded Lightning message of type:', lightningMessage.getTypeName(), `(${lightningMessage.getType()})`);
		this.autoRespond(lightningMessage);

		// resolve promises awaiting data input
		if (this.dataPromise) {
			this.dataResolve(decryptedResponse);
			this.dataPromise = null;
		}
	}

	private autoRespond(message: LightningMessage) {
		if (message instanceof Message.InitMessage) {
			this.send(message.toBuffer());
		}

		if (message instanceof Message.PingMessage) {
			const values = message['values'];
			const pongMessage = new Message.PongMessage({
				ignored: Buffer.alloc(values.num_pong_bytes)
			});
			console.log('Sending pong message:', pongMessage.toBuffer().toString('hex'));
			this.send(pongMessage.toBuffer());
		}
	}

	private destroy(error?: Error) {
		if (this.dataPromise) {
			this.dataReject(error || new Error('connection closed'));
			this.dataPromise = null;
		}
		this.socket.destroy();
		console.log('destroyed');
		delete LightningClient.clients[this.id];
	}

	public send(data: Buffer) {
		if (this.socket.destroyed) {
			throw new Error('socket destroyed');
		}

		if (this.transmissionHandler) {
			const encryptedData = this.transmissionHandler.send(data);
			this.socket.write(encryptedData);
			return;
		}

		this.socket.write(data);
	}

	public async receive(): Promise<Buffer> {
		if (this.dataPromise) {
			return this.dataPromise;
		}

		if (this.socket.destroyed) {
			return Promise.reject(new Error('socket destroyed'));
		}

		if (this.pendingRawData.length > 0 && !this.transmissionHandler) {
			// if we have a transmission handler, we need to wait until we have enough to decrypt
			this.pendingRawData = LightningClient.ZERO_BUFFER;
			return Promise.resolve(this.pendingRawData);
		}

		this.dataPromise = new Promise((resolve, reject) => {
			this.dataResolve = resolve;
			this.dataReject = reject;
		});

		return this.dataPromise;
	}
}
