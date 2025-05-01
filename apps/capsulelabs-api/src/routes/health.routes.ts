import express from 'express';

const healthRouter = (router: express.Router) => {
  router.get('/health', (req, res) => {
    res.status(200).json({ greeting: 'Hello World!' });
  });
};

export default healthRouter;
