import { Router }      from 'express';
import { analyzeLogs } from '../controllers/logsController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

/**
 * POST /api/v1/logs/analyze
 *
 * Body: { logs: Array<{ level, message, service, timestamp, traceId?, instance? }> }
 */
router.post('/analyze', asyncHandler(analyzeLogs));

export default router;
