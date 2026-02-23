import express from 'express';
import { 
    crearProducto, 
    obtenerProductos, 
    obtenerProductoPorId,
    actualizarProducto,
    eliminarProducto 
} from '../controllers/productoController.js';
import { authRequired } from '../middlewares/ValidateToken.js';
import ventasRouter from './ventas.routes.js';
application.use('/api/ventas', ventasRouter);

const router = express.Router();

// Rutas públicas
router.get('/', obtenerProductos);
router.get('/:id', obtenerProductoPorId);

// Rutas protegidas
router.post('/', authRequired, crearProducto);
router.put('/:id', authRequired, actualizarProducto);
router.delete('/:id', authRequired, eliminarProducto);

export default router;
