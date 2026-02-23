import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Verificar si ya existe un admin
        const existingAdmin = await User.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('Ya existe un administrador:', existingAdmin.username);
            console.log('Puedes usar estos credenciales para crear nuevos usuarios');
            process.exit(0);
        }
        
        // Crear administrador inicial
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const adminUser = new User({
            username: 'admin',
            email: 'admin@sistema.com',
            password: hashedPassword,
            role: 'admin'
        });
        
        await adminUser.save();
        
        console.log('Administrador creado exitosamente:');
        console.log('Username: admin');
        console.log('Email: admin@sistema.com');
        console.log('Password: admin123');
        console.log('');
        console.log('¡IMPORTANTE! Cambia la contraseña después del primer inicio de sesión.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error al crear administrador:', error);
        process.exit(1);
    }
};

createAdmin();