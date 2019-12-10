import * as debugModule from 'debug';
import * as express from 'express';
import {router} from './src/api';

const app = express();
const port = 3000;
const debug = debugModule('lightning-proxy-server:index');

app.use('/api/', router);

app.listen(port, () => {
	debug('Listening on port %d', port);
});
