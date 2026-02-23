// src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { createAccessToken } from '../libs/jwt.js';
import { TOKEN_SECRET } from '../config.js';
import Venta from '../models/venta.model.js';
import Producto from '../models/producto.model.js';
import Promocion from '../models/promocion.model.js';

export const login = async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // Log the attempt
        console.log('Login attempt:', { email, username });

        // Buscar usuario por email o username
        let userFound;

        if (email) {
            userFound = await User.findOne({ email });
        } else if (username) {
            userFound = await User.findOne({ username });
        } else {
            return res.status(400).json({ message: "Debes proporcionar un email o nombre de usuario" });
        }

        if (!userFound || !(await bcrypt.compare(password, userFound.password))) {
            return res.status(400).json({ message: "Usuario o contraseña incorrectos" });
        }

        // Verificar si la cuenta está bloqueada
        if (userFound.isLocked) {
            return res.status(423).json({ message: "Cuenta bloqueada temporalmente por múltiples intentos fallidos" });
        }

        // Verificar si el usuario está activo
        if (!userFound.isActive) {
            return res.status(403).json({ message: "Cuenta desactivada" });
        }

        // Resetear intentos de login
        await userFound.resetLoginAttempts();

        // Actualizar último acceso
        userFound.lastLogin = new Date();
        await userFound.save();

        const token = await createAccessToken({ id: userFound._id });

        res.cookie('token', token, {
            httpOnly: true, // No accesible desde JavaScript (protege contra XSS)
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict', // Protege contra CSRF
            maxAge: 24 * 60 * 60 * 1000 // 1 día (alineado al JWT)
        });

        res.json({
            id: userFound._id,
            username: userFound.username,
            email: userFound.email,
            role: userFound.role,
            permissions: userFound.permissions,
            branch: userFound.branch
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

export const register = async (req, res) => {
    try {
        const { username, email, password, role = 'cashier', branch = 'main' } = req.body;

        // Verificar que el usuario autenticado tenga permisos para crear usuarios
        if (!req.user || !req.user.hasPermission('USER', 'CREATE')) {
            return res.status(403).json({ message: 'No tienes permisos para crear usuarios' });
        }

        const [emailExists, usernameExists] = await Promise.all([
            User.findOne({ email }),
            User.findOne({ username })
        ]);

        const errors = {};
        if (emailExists) errors.email = 'El email ya está registrado';
        if (usernameExists) errors.username = 'El username ya está registrado';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ errors });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Obtener permisos por defecto según el rol
        const defaultPermissions = User.getDefaultPermissions(role);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role,
            branch,
            permissions: defaultPermissions,
            createdBy: req.user.id
        });

        const userSaved = await newUser.save();

        res.status(201).json({
            id: userSaved._id,
            username: userSaved.username,
            email: userSaved.email,
            role: userSaved.role,
            permissions: userSaved.permissions,
            branch: userSaved.branch,
            message: 'Usuario creado exitosamente'
        });
    } catch (error) {
        console.error('Error en register:', error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

export const logout = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0)
    });
    return res.sendStatus(200);
};

export const verifyToken = async (req, res) => {
    // El middleware requireAuth ya verificó el token y agregó req.user
    try {
        const userFound = await User.findById(req.user.id);
        if (!userFound) return res.status(401).json({ message: "Usuario no encontrado" });

        return res.json({
            id: userFound._id,
            username: userFound.username,
            email: userFound.email,
            role: userFound.role,
            permissions: userFound.permissions,
            branch: userFound.branch
        });
    } catch (error) {
        return res.status(401).json({ message: "Token inválido" });
    }
};

export const profile = async (req, res) => {
    try {
        const userFound = await User.findById(req.user.id);
        if (!userFound) {
            return res.status(400).json({ message: "Usuario no encontrado" });
        }
        res.json({
            id: userFound._id,
            username: userFound.username,
            email: userFound.email,
            role: userFound.role
        });
    } catch (error) {
        res.status(500).json({ message: "Error en el servidor" });
    }
};

export const principal = async (req, res) => {
    try {
        // Obtener ingresos totales
        const ventas = await Venta.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: "$total" }
                }
            }
        ]);

        // Obtener cantidad total de productos
        const cantidadProductos = await Producto.countDocuments();

        // Obtener productos más vendidos
        const productosVendidos = await Venta.aggregate([
            { $unwind: "$productos" },
            {
                $group: {
                    _id: "$productos.producto",
                    cantidadVendida: { $sum: "$productos.cantidad" }
                }
            },
            { $sort: { cantidadVendida: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "productos",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productoInfo"
                }
            },
            { $unwind: "$productoInfo" },
            {
                $project: {
                    _id: 1,
                    nombre: "$productoInfo.nombre",
                    cantidadVendida: 1
                }
            }
        ]);

        // Obtener productos con stock bajo (menos de 10 unidades)
        const stockBajo = await Producto.find({ stock: { $lt: 10 } })
            .select('nombre stock')
            .limit(5);

        // Obtener ventas recientes
        const ventasRecientes = await Venta.find()
            .sort({ fecha: -1 })
            .limit(5)
            .select('cliente total fecha');

        // Obtener promociones activas
        const promociones = await Promocion.find({ activa: true })
            .select('nombre descuento')
            .limit(5);

        res.json({
            ingresos: ventas[0]?.total || 0,
            cantidadProductos,
            productosVendidos,
            stockBajo,
            ventasRecientes,
            promociones
        });
    } catch (error) {
        console.error('Error en principal:', error);
        res.status(500).json({ message: "Error al obtener datos del principal" });
    }
};
