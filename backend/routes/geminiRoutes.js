import express from 'express';
import { chatWithAI, getAIStatus } from '../controllers/geminiController.js';

const router = express.Router();

router.post('/chat', chatWithAI);
router.get('/status', getAIStatus);

export default router;