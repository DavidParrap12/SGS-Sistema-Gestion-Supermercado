import Venta from '../models/venta.model.js';
import Producto from '../models/producto.model.js'; // Importamos el modelo de Producto

export const getVentas = async (req, res) => {
    try {
        const ventas = await Venta.find()
            .populate('productos.producto')
            .populate('vendedor');
        res.json(ventas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createVenta = async (req, res) => {
    try {
        // Iniciamos una sesión de transacción para asegurar que todas las operaciones se completen o ninguna
        const nuevaVenta = new Venta(req.body);
        const ventaGuardada = await nuevaVenta.save();
        
        // Actualizar el inventario para cada producto vendido
        for (const item of req.body.productos) {
            // Buscar el producto por su ID
            const producto = await Producto.findById(item.producto);
            
            if (!producto) {
                return res.status(404).json({ message: `Producto con ID ${item.producto} no encontrado` });
            }
            
            // Verificar si hay suficiente cantidad en inventario
            if (producto.cantidad < item.cantidad) {
                return res.status(400).json({ 
                    message: `cantidad insuficiente para ${producto.nombre}. Disponible: ${producto.cantidad}, Solicitado: ${item.cantidad}` 
                });
            }
            
            // Actualizar el cantidad del producto
            producto.cantidad -= item.cantidad;
            await producto.save();
        }
        
        res.status(201).json(ventaGuardada);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};