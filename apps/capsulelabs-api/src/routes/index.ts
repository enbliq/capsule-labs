import express from 'express';
import healthRouter from './health.routes';
import secretDrop from './secretDrop.router';

const router = express.Router();
export default (): express.Router => {
  healthRouter(router);
  secretDrop(router);
  return router;
};
