import Venta from '../models/venta.model.js';
import Producto from '../models/producto.model.js';

export const generarReporte = async (req, res) => {
    try {
        console.log('Iniciando generación de reporte...');
        
        // Obtener todas las ventas con populate
        const ventas = await Venta.find().populate('productos.producto').populate('vendedor');
        console.log('Ventas encontradas:', ventas.length);

        // Calcular ingresos totales
        const ingresos = ventas.reduce((acc, venta) => {
            return acc + (venta.total || 0);
        }, 0);
        console.log('Ingresos calculados:', ingresos);

        // Obtener todos los productos en inventario
        const inventario = await Producto.find();
        console.log('Productos en inventario:', inventario.length);

        const response = {
            ventas: ventas || [],
            ingresos: ingresos || 0,
            inventario: inventario || []
        };

        console.log('Respuesta preparada:', {
            ventasCount: response.ventas.length,
            ingresos: response.ingresos,
            inventarioCount: response.inventario.length
        });

        res.json(response);
    } catch (error) {
        console.error('Error detallado al generar el reporte:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ 
            message: 'Error al generar el reporte',
            error: error.message 
        });
    }
};