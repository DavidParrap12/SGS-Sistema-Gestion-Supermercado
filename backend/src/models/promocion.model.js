import mongoose from 'mongoose';

const promocionSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: true
    },
    descuento: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    fechaInicio: {
        type: Date,
        required: true
    },
    fechaFin: {
        type: Date,
        required: true
    },
    activa: {
        type: Boolean,
        default: true
    },
    productos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto'
    }]
});

export default mongoose.models.Promocion || mongoose.model('Promocion', promocionSchema); 