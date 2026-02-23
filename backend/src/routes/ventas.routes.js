import { Router } from 'express';
import { getVentas, createVenta } from '../controllers/venta.controller.js';
import { authRequired } from '../middlewares/ValidateToken.js';

const router = Router();

router.get('/', authRequired, getVentas);
router.post('/', authRequired, createVenta);

export default router;