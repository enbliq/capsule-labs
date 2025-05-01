import mongoose, { ConnectOptions } from 'mongoose';
import dotenv from 'dotenv';
import logger from '../config/logger';

dotenv.config();

export async function connectDB() {
  const db =
    (process.env.NODE_ENV === 'development'
      ? process.env.LOCAL_MONGO_URL
      : process.env.PROD_MONGO_URL) ?? ' ';

  await mongoose
    .connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as ConnectOptions)
    .then(() => {
      logger.info(
        '<-----x----------------------------------------------------------->'
      );
      logger.info('Successfully connected to a database');
      logger.info(
        '<---------------------------------------------------------------->'
      );
    })
    .catch((error) => {
      logger.info(
        '<---------------------------------------------------------------->'
      );
      logger.fatal('Error connecting to database', 'connection failed ', error);
      logger.info(
        '<---------------------------------------------------------------->'
      );
    });
}
