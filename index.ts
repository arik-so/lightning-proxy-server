import {app} from './src/app';
import * as debugModule from 'debug';

const port = 3000;
const debug = debugModule('lightning-proxy-server:index');

app.listen(port, () => {
	debug('Listening on port %d', port);
});
