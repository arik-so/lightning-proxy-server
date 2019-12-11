import {app} from '../src/app';
import * as chai from 'chai';
import {Handshake, Role} from 'bolt08';
import * as supertest from 'supertest';
import {SuperTest, Test} from 'supertest';
import * as crypto from 'crypto';
import {LightningMessage} from 'bolt02';
import {InitMessage} from 'bolt02/src/messages/init';

const assert = chai.assert;

describe('Web Client Integration Test', () => {

	let testServer: SuperTest<Test>;

	before(() => {
		testServer = supertest(app)
	});

	it('should complete a full setup round with the server', async () => {

		// initiate connection
		const remotePublicKey = Buffer.from('027455aef8453d92f4706b560b61527cc217ddf14da41770e8ed6607190a1851b8', 'hex');
		const url = '027455aef8453d92f4706b560b61527cc217ddf14da41770e8ed6607190a1851b8@3.13.29.161:9735';
		const privateKey = crypto.randomBytes(32);

		const role = Role.INITIATOR;
		const handshakeHandler = new Handshake({privateKey});

		const firstActOutput = handshakeHandler.actDynamically({role, remotePublicKey});
		const firstResponse = await testServer.post('/api/connect').send({
			url,
			message: firstActOutput.responseBuffer.toString('hex')
		});

		const id = firstResponse.body.id;
		const thirdActInput = Buffer.from(firstResponse.body.message, 'hex');

		const thirdActOutput = handshakeHandler.actDynamically({role, incomingBuffer: thirdActInput});
		const lastResponse = await testServer.post('/api/handshake/' + id).send({
			message: thirdActOutput.responseBuffer.toString('hex'),
			keys: {
				sending: thirdActOutput.transmissionHandler['sendingKey'].toString('hex'),
				receiving: thirdActOutput.transmissionHandler['receivingKey'].toString('hex'),
				chaining: thirdActOutput.transmissionHandler['chainingKey'].toString('hex')
			}
		});

		const lightningMessageBuffer = Buffer.from(lastResponse.body.message, 'hex');
		const lightningMessage = LightningMessage.parse(lightningMessageBuffer);
		assert.instanceOf(lightningMessage, InitMessage);
	});

	after(() => {
		process.exit(0);
	})

});
