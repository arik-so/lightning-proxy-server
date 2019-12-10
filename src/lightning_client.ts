import {Socket} from 'net';
import * as crypto from 'crypto';
import {TransmissionHandler} from 'bolt08';

export default class LightningClient {

	private static clients = {};

	private static readonly ZERO_BUFFER = Buffer.alloc(0);

	public readonly id: string;
	private readonly socket: Socket;

	private pendingData: Buffer = LightningClient.ZERO_BUFFER;
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
			this.pendingData = Buffer.concat([this.pendingData, data]);

			// resolve promises awaiting data input
			if (this.dataPromise) {
				this.dataResolve(this.pendingData);
				this.pendingData = LightningClient.ZERO_BUFFER;
				this.dataPromise = null;
			}
		});

		this.socket.on('error', (error: Error) => {
			console.log('Error:');
			console.log(error);

			if (this.dataPromise) {
				this.dataReject(error);
				this.dataPromise = null;
				this.socket.destroy();
			}
		});

		this.socket.on('close', () => {
			console.log('Connection closed');

			if (this.dataPromise) {
				this.dataReject(new Error('connection closed'));
				this.dataPromise = null;
				this.socket.destroy();
			}
		});

	}

	public async receiveData(): Promise<Buffer> {
		if (this.dataPromise) {
			return this.dataPromise;
		}

		if (this.pendingData.length > 0) {
			this.pendingData = LightningClient.ZERO_BUFFER;
			return Promise.resolve(this.pendingData);
		}

		this.dataPromise = new Promise((resolve, reject) => {
			this.dataResolve = resolve;
			this.dataReject = reject;
		});

		return this.dataPromise;
	}
}
