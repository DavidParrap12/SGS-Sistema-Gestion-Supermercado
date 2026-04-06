// src/index.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import productoRouter from './routes/producto.routes.js';
import authRouter from './routes/auth.routes.js';
import ventasRouter from './routes/ventas.routes.js';
import reportesRouter from './routes/reportes.routes.js';
import adminRouter from './routes/admin.routes.js';
import auditRouter from './routes/audit.routes.js';
import backupRouter from './routes/backup.routes.js';
import backupService from './services/backup.service.js';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

// Necesario para Railway/Vercel: confiar en el proxy inverso (X-Forwarded-For)
app.set('trust proxy', 1);

// Middlewares de Seguridad Básicos
app.use(helmet()); // Configura cabeceras HTTP de seguridad
app.use(mongoSanitize()); // Protege contra inyecciones NoSQL en req.body, req.query o req.params
app.use(xss()); // Limpia código malicioso en los inputs de HTML

// Configuración de Rate Limiter (Protección contra DDoS y Fuerza Bruta)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // Limita cada IP a 200 peticiones por ventana
    message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL]
        : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' })); // Limitar tamaño de payload (mitigar DDoS)
app.use(cookieParser());

// Verificar variables de entorno al arrancar

// Conectar a MongoDB
// MongoDB connection with options
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(async () => {
        console.log('Connected to MongoDB');

        // Inicializar servicio de respaldo
        try {
            await backupService.initialize();
        } catch (error) {
            console.error('Error al inicializar servicio de respaldo:', error);
        }

        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    })
    .catch(error => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });

// Rutas
app.use('/api', productoRouter);
app.use('/api/auth', authRouter);
app.use('/api/ventas', ventasRouter);
app.use('/api', reportesRouter);
app.use('/api', adminRouter);
app.use('/api/audit', auditRouter);
app.use('/api/backup', backupRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Validar variables de entorno obligatorias
if (!process.env.MONGODB_URI) {
    console.error('Error: La variable MONGODB_URI no está definida en el archivo .env');
    process.exit(1);
}

if (!process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
    console.error('Error: La variable MONGODB_URI tiene un formato incorrecto');
    process.exit(1);
}
