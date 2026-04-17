import { Router }               from 'express';
import { triage, rootCause }   from '../controllers/incidentsController.js';
import { asyncHandler }         from '../middleware/asyncHandler.js';

const router = Router();

/**
 * POST /api/v1/incidents/triage
 *
 * Body: { title, description, severity, affectedServices }
 */
router.post('/triage', asyncHandler(triage));

/**
 * POST /api/v1/incidents/root-cause
 *
 * Body: { title, description, severity, affectedServices, logs? }
 */
router.post('/root-cause', asyncHandler(rootCause));

export default router;
