import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import signale from 'signale';

import { isProduction } from './modules/common';
import dbConnect from './modules/dbConnect';
import { errorHandler } from './modules/error';
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
        isProduction
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
app.use(cookieParser(process.env.SECRET));

setupRoutes(app);

app.use(errorHandler);

const port = process.env.PORT || 2000;

const server = app.listen(port, () => {
  signale.info(`Listening at http://localhost:${port}/`);
});

server.on('error', signale.error);
