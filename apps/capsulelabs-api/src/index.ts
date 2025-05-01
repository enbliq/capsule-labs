import express from 'express';
import logger from './config/logger';
import { loggingHandler } from './middleware/pinoHttp';
import { routeError } from './middleware/routeError';
import { connectDB } from './config/db';
import capsuleLabsRouter from './routes/index';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
dotenv.config();

const app = express();

app.use(
  cors({
    origin: '*',
    allowedHeaders: '*',
    exposedHeaders: '*',
  })
);

app.use(loggingHandler);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api/v1/capsule', capsuleLabsRouter());

app.use(routeError);

app.listen(process.env.PORT, () => {
  logger.info(
    `<---------------------------------------------------------------->`
  );
  logger.info(`Server is running on port ${process.env.PORT}`);
  connectDB();
  logger.info(
    `<---------------------------------------------------------------->`
  );
});
