import * as express from 'express';
import {router} from './api';

export const app = express();

app.use('/api/', router);
