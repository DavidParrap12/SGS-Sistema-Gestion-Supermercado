import { Router } from 'express';
import { 
    getProductos, 
    createProducto, 
    updateProducto, 
    deleteProducto,
    buscarProductoPorCodigo
} from '../controllers/producto.controller.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';
import { auditMiddleware } from '../middleware/audit.middleware.js';

const router = Router();

router.get('/productos', getProductos);
router.post('/productos', requireAuth, requirePermission('PRODUCT', 'CREATE'), auditMiddleware({ action: 'CREATE', resource: 'PRODUCT', description: 'Creación de nuevo producto' }), createProducto);
router.put('/productos/:id', requireAuth, requirePermission('PRODUCT', 'UPDATE'), auditMiddleware({ action: 'UPDATE', resource: 'PRODUCT', description: 'Actualización de producto' }), updateProducto);
router.delete('/productos/:id', requireAuth, requirePermission('PRODUCT', 'DELETE'), auditMiddleware({ action: 'DELETE', resource: 'PRODUCT', description: 'Eliminación de producto' }), deleteProducto);
router.get('/codigo/:codigo', buscarProductoPorCodigo);
export default router;
