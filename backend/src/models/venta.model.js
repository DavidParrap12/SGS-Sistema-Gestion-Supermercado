import mongoose from 'mongoose';

const ventaSchema = new mongoose.Schema({
    productos: [{
        producto: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Producto',
            required: true
        },
        cantidad: {
            type: Number,
            required: true,
            min: 1
        },
        precioUnitario: {
            type: Number,
            required: true
        }
    }],
    total: {
        type: Number,
        required: true
    },
    vendedor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.models.Venta || mongoose.model('Venta', ventaSchema); 