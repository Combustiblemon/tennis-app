import compression from 'compression';
import cors from 'cors';
import express from 'express';
import signale from 'signale';

import dbConnect from './modules/dbConnect';
import { setupRoutes } from './modules/routes';

const app = express();

dbConnect();

const findOrigin = (origin: string) =>
  new RegExp(/(?<=https:\/\/).*?(?=\/)/, '').exec(origin)?.[0] || '';

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        !process.env.ALLOW_ORIGIN ||
        process.env.ALLOW_ORIGIN?.includes(findOrigin(origin)) ||
        process.env.DB !== 'PROD_DB'
      ) {
        callback(null, true);
      } else {
        signale.info('cors error, origin: ', origin, findOrigin(origin));
        callback(new Error('Not allowed by CORS'));
      }
    },
  }),
);

app.use(express.json({ limit: '5mb' }));

app.use(compression());

setupRoutes(app);

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/`);
});

server.on('error', console.error);
