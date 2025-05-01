import express from 'express';
import {
  createSecretDropCapsule,
  deleteCapsule,
  generateUniqueHash,
  getCapsule,
  unlockCapsule,
  updateCapsule,
} from '../controllers/secretDrop/secretDrop.controller';

const secretDropRouter = (router: express.Router) => {
  router.get('/', getCapsule);
  router.put('/:id', updateCapsule);
  router.delete('/:id', deleteCapsule);
  router.put('/:id', unlockCapsule);
  router.post('/secretDrop/unlock/:id', createSecretDropCapsule);
};

export default secretDropRouter;
